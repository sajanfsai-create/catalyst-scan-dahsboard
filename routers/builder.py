"""
CatalystScan — Builder Router
.exe package build, download, upload, and public download endpoints.
v2.5: Partners can generate builds for their assigned orgs.
      Super admin maintains the base .exe template.
"""
import os
from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File
from fastapi.responses import FileResponse

import database as db
import exe_builder
from middleware import require_admin, require_super_admin, require_partner_or_admin
from models import BuildExeRequest

router = APIRouter(tags=["builder"])


@router.post("/api/build-exe")
async def build_exe(request: Request, payload: BuildExeRequest, user=Depends(require_partner_or_admin)):
    """Generate an org-specific .exe package. Partners can only build for their own orgs."""
    
    # Partner authorization: verify org belongs to them
    if user["role"] == "partner":
        partner_id = user.get("partner_id")
        if not partner_id:
            raise HTTPException(status_code=400, detail="No partner linked to this account")
        partner_orgs = db.get_orgs_by_partner(partner_id)
        org_ids = [o["id"] for o in partner_orgs]
        if payload.org_id not in org_ids:
            raise HTTPException(status_code=403, detail="You can only build packages for organizations assigned to your account")
    
    result = exe_builder.build_org_exe(
        org_name=payload.org_name,
        org_id=payload.org_id,
        telemetry_url=payload.telemetry_url,
        scan_limit=payload.scan_limit,
        built_by=user.get("username", "unknown"),
    )
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    
    # Get org credit balance to inform the partner
    org_credits = db.get_org_credit_balance(payload.org_id) if hasattr(db, 'get_org_credit_balance') else {}
    
    return {
        "success": True,
        "download_url": f"/api/build-exe/download/{result['zip_filename']}",
        "filename": result["zip_filename"],
        "org_name": result["org_name"],
        "build_id": result.get("build_id", ""),
        "build_version": result.get("build_version", ""),
        "org_credits": org_credits,
        "message": f"Package ready! Each device deployment will consume {payload.scan_limit} credits from {payload.org_name}'s pool."
    }


@router.get("/api/build-exe/download/{filename}")
async def download_exe(filename: str, user=Depends(require_partner_or_admin)):
    """Download a generated build. Partners can only download their own orgs' builds."""
    filename = os.path.basename(filename)
    
    # Partner authorization: verify filename matches one of their orgs
    if user["role"] == "partner":
        partner_id = user.get("partner_id")
        if partner_id:
            orgs = db.get_orgs_by_partner(partner_id)
            org_names = {o["name"].lower().replace(" ", "_") for o in orgs}
            if not any(on in filename.lower() for on in org_names):
                raise HTTPException(status_code=403, detail="Access denied to this build")
    
    builds_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "generated_builds")
    file_path = os.path.join(builds_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Build not found")
    return FileResponse(file_path, media_type="application/zip", filename=filename)


@router.get("/api/build-exe/list")
async def list_builds(user=Depends(require_partner_or_admin)):
    """List generated builds — scoped to partner's orgs if partner role."""
    all_builds = exe_builder.list_generated_builds()
    
    if user["role"] == "partner":
        partner_id = user.get("partner_id")
        if partner_id:
            orgs = db.get_orgs_by_partner(partner_id)
            org_names = {o["name"].lower().replace(" ", "_") for o in orgs}
            all_builds = [b for b in all_builds if any(on in b["filename"].lower() for on in org_names)]
    
    return {"builds": all_builds}


@router.delete("/api/build-exe/{filename}")
async def delete_build(filename: str, _admin=Depends(require_super_admin)):
    """Delete a generated build. Super admin only."""
    return {"deleted": exe_builder.delete_build(filename)}


@router.post("/api/build-exe/upload")
async def upload_base_exe(file: UploadFile = File(...), _admin=Depends(require_super_admin)):
    """Upload the base CatalystScan.exe template. Super admin only."""
    if not file.filename.endswith(".exe"):
        raise HTTPException(status_code=400, detail="Only .exe files are accepted")
    
    # Stream the file directly to disk to prevent OOM crashes on the server
    import shutil
    import os
    
    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)
        
    dest = os.path.join(uploads_dir, "CatalystScan.exe")
    with open(dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    size_mb = round(os.path.getsize(dest) / (1024 * 1024), 2)
    if size_mb < 0.001:
        raise HTTPException(status_code=400, detail="File appears too small to be valid")
        
    import datetime
    return {
        "success": True,
        "path": dest,
        "size_mb": size_mb,
        "uploaded_at": datetime.datetime.now().isoformat(),
    }


@router.get("/api/build-exe/status")
async def get_base_exe_status(user=Depends(require_partner_or_admin)):
    """Check if the base .exe template exists."""
    return exe_builder.get_base_exe_info()


@router.get("/api/build-exe/history")
async def get_build_history(user=Depends(require_partner_or_admin)):
    """Get build registry history — scoped to role."""
    if user["role"] == "partner":
        partner_id = user.get("partner_id")
        builds = db.get_build_history(partner_id=partner_id)
    else:
        builds = db.get_build_history()
    return {"builds": builds}


# ── Public Downloads (no auth) ──

@router.get("/api/public/downloads")
async def list_public_downloads():
    builds = exe_builder.list_generated_builds()
    return {"builds": builds, "total": len(builds)}

@router.get("/api/public/download/{filename}")
async def public_download(filename: str):
    safe_name = os.path.basename(filename)
    if not safe_name.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Invalid file type")
    builds_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "generated_builds")
    file_path = os.path.join(builds_dir, safe_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Package not found")
    return FileResponse(file_path, media_type="application/zip", filename=safe_name)

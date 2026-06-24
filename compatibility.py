"""
CatalystScan — Software Compatibility Engine
Maps scanned hardware specs against real-world academic software requirements.
"""


# ── Software Requirements Database ──
# Each entry: {min_ram_gb, rec_ram_gb, min_cores, rec_cores, gpu_required, min_vram_mb, rec_vram_mb, min_disk_gb}

SOFTWARE_REQUIREMENTS = {
    "Web Development": {
        "description": "VS Code, Node.js, Chrome DevTools, React, Angular",
        "examples": ["VS Code", "Node.js", "Chrome DevTools", "Postman"],
        "min_ram_gb": 4,
        "rec_ram_gb": 8,
        "min_cores": 2,
        "rec_cores": 4,
        "gpu_required": False,
        "min_vram_mb": 0,
        "rec_vram_mb": 0,
        "min_disk_gb": 50,
    },
    "Desktop Development": {
        "description": "Visual Studio, IntelliJ IDEA, .NET, Java, C++",
        "examples": ["Visual Studio 2022", "IntelliJ IDEA", "Eclipse", "NetBeans"],
        "min_ram_gb": 8,
        "rec_ram_gb": 16,
        "min_cores": 4,
        "rec_cores": 6,
        "gpu_required": False,
        "min_vram_mb": 0,
        "rec_vram_mb": 0,
        "min_disk_gb": 100,
    },
    "Mobile Development": {
        "description": "Android Studio, Flutter, React Native, Xcode",
        "examples": ["Android Studio", "Flutter", "React Native", "Kotlin"],
        "min_ram_gb": 8,
        "rec_ram_gb": 16,
        "min_cores": 4,
        "rec_cores": 6,
        "gpu_required": True,
        "min_vram_mb": 512,
        "rec_vram_mb": 2048,
        "min_disk_gb": 100,
    },
    "Databases": {
        "description": "MySQL, PostgreSQL, MongoDB, SQL Server",
        "examples": ["MySQL Workbench", "pgAdmin", "MongoDB Compass", "SQL Server"],
        "min_ram_gb": 4,
        "rec_ram_gb": 16,
        "min_cores": 2,
        "rec_cores": 4,
        "gpu_required": False,
        "min_vram_mb": 0,
        "rec_vram_mb": 0,
        "min_disk_gb": 50,
    },
    "Virtualization": {
        "description": "Docker, VMware, VirtualBox, Hyper-V",
        "examples": ["Docker Desktop", "VMware Workstation", "VirtualBox", "WSL2"],
        "min_ram_gb": 8,
        "rec_ram_gb": 32,
        "min_cores": 4,
        "rec_cores": 8,
        "gpu_required": False,
        "min_vram_mb": 0,
        "rec_vram_mb": 0,
        "min_disk_gb": 100,
    },
    "AI & Data Science": {
        "description": "Python, TensorFlow, PyTorch, Jupyter, Pandas",
        "examples": ["TensorFlow", "PyTorch", "Jupyter Notebook", "Anaconda"],
        "min_ram_gb": 8,
        "rec_ram_gb": 32,
        "min_cores": 4,
        "rec_cores": 8,
        "gpu_required": True,
        "min_vram_mb": 4096,
        "rec_vram_mb": 8192,
        "min_disk_gb": 100,
    },
    "CAD & Engineering": {
        "description": "AutoCAD, CATIA, SolidEdge, SolidWorks, ANSYS",
        "examples": ["AutoCAD", "CATIA V5", "Solid Edge", "ANSYS", "SolidWorks"],
        "min_ram_gb": 8,
        "rec_ram_gb": 32,
        "min_cores": 4,
        "rec_cores": 8,
        "gpu_required": True,
        "min_vram_mb": 2048,
        "rec_vram_mb": 4096,
        "min_disk_gb": 100,
    },
    "Game Development": {
        "description": "Unity, Unreal Engine, Godot, Blender",
        "examples": ["Unity 2023", "Unreal Engine 5", "Godot 4", "Blender"],
        "min_ram_gb": 8,
        "rec_ram_gb": 32,
        "min_cores": 4,
        "rec_cores": 8,
        "gpu_required": True,
        "min_vram_mb": 4096,
        "rec_vram_mb": 8192,
        "min_disk_gb": 200,
    },
    "Video Editing": {
        "description": "Premiere Pro, DaVinci Resolve, After Effects",
        "examples": ["Adobe Premiere Pro", "DaVinci Resolve", "After Effects"],
        "min_ram_gb": 8,
        "rec_ram_gb": 32,
        "min_cores": 4,
        "rec_cores": 8,
        "gpu_required": True,
        "min_vram_mb": 2048,
        "rec_vram_mb": 6144,
        "min_disk_gb": 200,
    },
    "Basic Office & Browsing": {
        "description": "MS Office, Google Workspace, Web Browsing, Email",
        "examples": ["Microsoft Office", "Google Docs", "Chrome", "Outlook"],
        "min_ram_gb": 4,
        "rec_ram_gb": 8,
        "min_cores": 2,
        "rec_cores": 4,
        "gpu_required": False,
        "min_vram_mb": 0,
        "rec_vram_mb": 0,
        "min_disk_gb": 30,
    },
}


def check_compatibility(scan_data):
    """
    Check system compatibility against all software categories.
    Returns a list of compatibility results.
    """
    # Extract system specs
    ram_gb = scan_data.get("ram", {}).get("total_gb", 0)

    cpu = scan_data.get("cpu", {})
    cores = cpu.get("cores", 0)

    # Get max VRAM across all GPUs
    gpus = scan_data.get("gpus", [])
    max_vram_mb = 0
    has_gpu = False
    for gpu in gpus:
        vram = gpu.get("vram_mb", 0)
        if vram > 0:
            has_gpu = True
            max_vram_mb = max(max_vram_mb, vram)

    # Get total disk space
    storage = scan_data.get("storage", {})
    drives = storage.get("drives", [])
    total_disk_gb = sum(d.get("capacity_gb", 0) for d in drives)

    results = []

    for category, reqs in SOFTWARE_REQUIREMENTS.items():
        bottlenecks = []
        status = "supported"  # supported, minimum, not_supported

        # Check RAM
        if ram_gb < reqs["min_ram_gb"]:
            status = "not_supported"
            bottlenecks.append(f"Needs {reqs['min_ram_gb']}GB RAM (has {ram_gb}GB)")
        elif ram_gb < reqs["rec_ram_gb"]:
            if status != "not_supported":
                status = "minimum"
            bottlenecks.append(f"Recommended {reqs['rec_ram_gb']}GB RAM (has {ram_gb}GB)")

        # Check CPU cores
        if cores < reqs["min_cores"]:
            status = "not_supported"
            bottlenecks.append(f"Needs {reqs['min_cores']} CPU cores (has {cores})")
        elif cores < reqs["rec_cores"]:
            if status != "not_supported":
                status = "minimum"
            bottlenecks.append(f"Recommended {reqs['rec_cores']} CPU cores (has {cores})")

        # Check GPU
        if reqs["gpu_required"]:
            if not has_gpu or max_vram_mb == 0:
                status = "not_supported"
                bottlenecks.append(f"Requires dedicated GPU with {reqs['min_vram_mb']}MB VRAM")
            elif max_vram_mb < reqs["min_vram_mb"]:
                status = "not_supported"
                bottlenecks.append(f"Needs {reqs['min_vram_mb']}MB VRAM (has {max_vram_mb}MB)")
            elif max_vram_mb < reqs["rec_vram_mb"]:
                if status != "not_supported":
                    status = "minimum"
                bottlenecks.append(f"Recommended {reqs['rec_vram_mb']}MB VRAM (has {max_vram_mb}MB)")

        # Check Disk
        if total_disk_gb < reqs["min_disk_gb"]:
            if status != "not_supported":
                status = "minimum"
            bottlenecks.append(f"Needs {reqs['min_disk_gb']}GB disk space (has {total_disk_gb:.0f}GB)")

        # Determine icon
        if status == "supported":
            icon = "✅"
            label = "Fully Supported"
        elif status == "minimum":
            icon = "⚠️"
            label = "Minimum Requirements Only"
        else:
            icon = "❌"
            label = "Not Supported"

        results.append({
            "category": category,
            "description": reqs["description"],
            "examples": reqs["examples"],
            "status": status,
            "icon": icon,
            "label": label,
            "bottlenecks": bottlenecks,
        })

    return results


def get_supported_categories(compatibility_results):
    """Get counts of supported/minimum/not_supported categories."""
    supported = sum(1 for r in compatibility_results if r["status"] == "supported")
    minimum = sum(1 for r in compatibility_results if r["status"] == "minimum")
    not_supported = sum(1 for r in compatibility_results if r["status"] == "not_supported")

    return {
        "supported": supported,
        "minimum": minimum,
        "not_supported": not_supported,
        "total": len(compatibility_results),
    }

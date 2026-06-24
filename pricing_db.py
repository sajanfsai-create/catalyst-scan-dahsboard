"""
CatalystScan — Hardware Pricing Database
Static pricing reference for Indian (INR) and US (USD) markets.
Used for replacement cost estimation in PDF reports and dashboard summaries.

Pricing Sources:
  - Amazon.in: https://www.amazon.in
  - MDComputers: https://mdcomputers.in
  - PrimeABGB: https://www.primeabgb.com
  - Amazon.com: https://www.amazon.com
  - Newegg: https://www.newegg.com

Prices are approximate market rates as of Q1 2026.
Update cycle: Every 3 days (manual review recommended).
"""

import datetime
import json
import os
import sys

# ── Last Updated Timestamp ──
PRICING_LAST_UPDATED = "2026-04-07"
PRICING_UPDATE_INTERVAL_DAYS = 3

# ── Exchange Rate (approximate) ──
USD_TO_INR = 92

# ── Pricing Database ──
# Each entry: { "spec": str, "inr": float, "usd": float, "source": str, "source_url": str }

RAM_PRICES = [
    {"spec": "DDR4 4GB 2666MHz", "inr": 1200, "usd": 14, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=ddr4+4gb+ram"},
    {"spec": "DDR4 8GB 2666MHz", "inr": 2200, "usd": 26, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=ddr4+8gb+ram"},
    {"spec": "DDR4 8GB 3200MHz", "inr": 2500, "usd": 28, "source": "MDComputers", "source_url": "https://mdcomputers.in/ram?type=ddr4&capacity=8gb"},
    {"spec": "DDR4 16GB 3200MHz", "inr": 4200, "usd": 50, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=ddr4+16gb+ram"},
    {"spec": "DDR4 32GB 3200MHz", "inr": 8500, "usd": 95, "source": "MDComputers", "source_url": "https://mdcomputers.in/ram?type=ddr4&capacity=32gb"},
    {"spec": "DDR5 8GB 4800MHz", "inr": 3500, "usd": 40, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=ddr5+8gb+ram"},
    {"spec": "DDR5 16GB 5600MHz", "inr": 6000, "usd": 65, "source": "PrimeABGB", "source_url": "https://www.primeabgb.com/ddr5-ram"},
    {"spec": "DDR5 32GB 5600MHz", "inr": 11000, "usd": 120, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=ddr5+32gb+ram"},
]

STORAGE_PRICES = [
    {"spec": "128GB SATA SSD", "inr": 1500, "usd": 18, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=128gb+ssd"},
    {"spec": "256GB SATA SSD", "inr": 2500, "usd": 28, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=256gb+ssd"},
    {"spec": "512GB SATA SSD", "inr": 4000, "usd": 45, "source": "MDComputers", "source_url": "https://mdcomputers.in/ssd?capacity=512gb"},
    {"spec": "1TB SATA SSD", "inr": 7500, "usd": 80, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=1tb+ssd"},
    {"spec": "256GB NVMe SSD", "inr": 3000, "usd": 32, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=256gb+nvme"},
    {"spec": "512GB NVMe SSD", "inr": 4500, "usd": 48, "source": "MDComputers", "source_url": "https://mdcomputers.in/ssd?type=nvme&capacity=512gb"},
    {"spec": "1TB NVMe SSD", "inr": 8000, "usd": 85, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=1tb+nvme"},
    {"spec": "500GB HDD 7200RPM", "inr": 2800, "usd": 30, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=500gb+hdd"},
    {"spec": "1TB HDD 7200RPM", "inr": 3500, "usd": 38, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=1tb+hdd"},
    {"spec": "2TB HDD 7200RPM", "inr": 5500, "usd": 58, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=2tb+hdd"},
]

CPU_PRICES = [
    {"spec": "Intel i3 (12th/13th Gen) Budget", "inr": 8000, "usd": 95, "source": "MDComputers", "source_url": "https://mdcomputers.in/processors?brand=intel&tier=i3"},
    {"spec": "Intel i5 (12th/13th Gen) Mid-range", "inr": 18000, "usd": 200, "source": "MDComputers", "source_url": "https://mdcomputers.in/processors?brand=intel&tier=i5"},
    {"spec": "Intel i7 (12th/13th Gen) High-end", "inr": 35000, "usd": 380, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=intel+i7+processor"},
    {"spec": "AMD Ryzen 5 5600 Mid-range", "inr": 12000, "usd": 130, "source": "MDComputers", "source_url": "https://mdcomputers.in/processors?brand=amd&tier=ryzen5"},
    {"spec": "AMD Ryzen 7 5800X High-end", "inr": 22000, "usd": 250, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=amd+ryzen+7"},
]

GPU_PRICES = [
    {"spec": "Integrated Graphics (Intel UHD/AMD Vega)", "inr": 0, "usd": 0, "source": "N/A", "source_url": ""},
    {"spec": "NVIDIA GT 1030 Entry", "inr": 8000, "usd": 90, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=gt+1030"},
    {"spec": "NVIDIA GTX 1650 Budget", "inr": 15000, "usd": 170, "source": "MDComputers", "source_url": "https://mdcomputers.in/graphics-cards?chip=gtx1650"},
    {"spec": "NVIDIA RTX 3060 Mid-range", "inr": 30000, "usd": 330, "source": "PrimeABGB", "source_url": "https://www.primeabgb.com/rtx-3060"},
    {"spec": "NVIDIA RTX 4060 High-end", "inr": 42000, "usd": 460, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=rtx+4060"},
]

MOTHERBOARD_PRICES = [
    {"spec": "H610/A520 Budget Motherboard", "inr": 6000, "usd": 70, "source": "MDComputers", "source_url": "https://mdcomputers.in/motherboards?chipset=h610"},
    {"spec": "B660/B550 Mid-range Motherboard", "inr": 12000, "usd": 130, "source": "MDComputers", "source_url": "https://mdcomputers.in/motherboards?chipset=b660"},
    {"spec": "Z690/X570 High-end Motherboard", "inr": 22000, "usd": 250, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=z690+motherboard"},
]

BATTERY_PRICES = [
    {"spec": "Standard Laptop Battery (generic)", "inr": 3500, "usd": 40, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=laptop+battery"},
    {"spec": "OEM Laptop Battery (brand-specific)", "inr": 5500, "usd": 65, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=oem+laptop+battery"},
]

MISC_PRICES = [
    {"spec": "Thermal Paste (Arctic MX-6)", "inr": 500, "usd": 8, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=thermal+paste"},
    {"spec": "Case Fan (120mm)", "inr": 600, "usd": 10, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=120mm+case+fan"},
    {"spec": "CMOS Battery (CR2032)", "inr": 50, "usd": 1, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=cr2032"},
    {"spec": "SATA Cable", "inr": 150, "usd": 3, "source": "Amazon.in", "source_url": "https://www.amazon.in/s?k=sata+cable"},
]


# ══════════════════════════════════════
# COST ESTIMATION ENGINE
# ══════════════════════════════════════

def _pick_ram_upgrade(current_gb, current_type):
    """Recommend a RAM upgrade based on current capacity and type."""
    ram_type = "DDR5" if "DDR5" in str(current_type).upper() else "DDR4"
    
    if current_gb < 8:
        target = "8GB"
        target_gb = 8
    elif current_gb < 16:
        target = "16GB"
        target_gb = 16
    else:
        return None  # Already sufficient
    
    for p in RAM_PRICES:
        if ram_type in p["spec"] and target in p["spec"]:
            return {**p, "reason": f"Upgrade from {current_gb}GB to {target_gb}GB {ram_type}"}
    return None


def _pick_storage_upgrade(current_gb, media_type, interface):
    """Recommend a storage upgrade."""
    if str(media_type).upper() == "HDD":
        # Recommend SSD migration
        if current_gb <= 256:
            target_spec = "256GB SATA SSD"
        elif current_gb <= 512:
            target_spec = "512GB SATA SSD"
        else:
            target_spec = "1TB SATA SSD"
        
        for p in STORAGE_PRICES:
            if p["spec"] == target_spec:
                return {**p, "reason": f"Replace {current_gb}GB HDD with {target_spec} (3-5x speed boost)"}
    
    if current_gb < 128:
        for p in STORAGE_PRICES:
            if "256GB" in p["spec"] and "SSD" in p["spec"]:
                return {**p, "reason": f"Upgrade from {current_gb}GB to 256GB SSD"}
    
    return None


def _pick_cpu_upgrade(cores, clock_mhz, brand_str):
    """Recommend a CPU upgrade if underpowered."""
    if cores is None:
        return None
    
    if cores <= 2 or (clock_mhz and clock_mhz < 2500):
        brand = str(brand_str).lower()
        if "amd" in brand:
            target = "AMD Ryzen 5 5600 Mid-range"
        else:
            target = "Intel i5 (12th/13th Gen) Mid-range"
        
        for p in CPU_PRICES:
            if p["spec"] == target:
                return {**p, "reason": f"Upgrade from {cores}-core/{clock_mhz}MHz to modern mid-range CPU"}
    
    return None


def _pick_battery_upgrade(battery_percent, battery_present):
    """Recommend battery replacement if health is low."""
    if battery_present and battery_percent is not None and battery_percent < 40:
        return {**BATTERY_PRICES[0], "reason": f"Battery health at {battery_percent}% — replacement recommended"}
    return None


def _pick_gpu_upgrade(gpu_data, health_priority="good"):
    """
    Recommend GPU upgrade based on GPU type (integrated vs discrete) and health grade.
    Returns a list of upgrade options (both motherboard bundle and discrete GPU for integrated).
    """
    if not gpu_data or not isinstance(gpu_data, list) or len(gpu_data) == 0:
        return []

    gpu = gpu_data[0] if isinstance(gpu_data, list) else gpu_data
    if gpu.get("error") or gpu.get("info"):
        return []

    # Only recommend if health priority is warning or critical (grade D/F)
    if health_priority not in ("critical", "warning"):
        return []

    is_integrated = gpu.get("is_integrated", False)
    name = gpu.get("name", "Unknown")
    vram = gpu.get("vram_mb", 0)
    items = []

    if is_integrated:
        # OPTION 1: Motherboard + CPU bundle (the proper fix for integrated GPU)
        mb_price = MOTHERBOARD_PRICES[1]  # Mid-range board
        cpu_price = CPU_PRICES[1]  # i5 mid-range
        bundle_inr = mb_price["inr"] + cpu_price["inr"]
        bundle_usd = mb_price["usd"] + cpu_price["usd"]
        items.append({
            "component": "GPU (Option A: MB+CPU Bundle)",
            "current_spec": f"{name} (Integrated)",
            "recommended": f"{mb_price['spec']} + {cpu_price['spec']}",
            "inr": bundle_inr,
            "usd": bundle_usd,
            "priority": health_priority,
            "source": mb_price["source"],
            "source_url": mb_price["source_url"],
            "reason": f"Integrated GPU ({name}) is soldered to motherboard — full MB+CPU replacement needed. "
                      f"RISK: Requires reinstallation of OS and all software. Ensure data backup before proceeding.",
        })

        # OPTION 2: Add a discrete GPU (if PCIe slot available)
        discrete_price = GPU_PRICES[1]  # GT 1030 entry-level
        items.append({
            "component": "GPU (Option B: Add Discrete GPU)",
            "current_spec": f"{name} (Integrated)",
            "recommended": discrete_price["spec"],
            "inr": discrete_price["inr"],
            "usd": discrete_price["usd"],
            "priority": "recommended",
            "source": discrete_price["source"],
            "source_url": discrete_price["source_url"],
            "reason": f"Add a discrete PCIe GPU alongside integrated {name}. "
                      f"RISK: Requires available PCIe x16 slot. Laptops do NOT support this — desktop only. "
                      f"Check PSU wattage is sufficient (minimum 300W recommended).",
        })
    else:
        # Discrete GPU — straight upgrade based on current VRAM
        if vram < 2048:
            target = GPU_PRICES[2]  # GTX 1650
        elif vram < 4096:
            target = GPU_PRICES[3]  # RTX 3060
        else:
            target = GPU_PRICES[4]  # RTX 4060

        items.append({
            "component": "GPU",
            "current_spec": f"{name} ({int(vram)}MB VRAM)",
            "recommended": target["spec"],
            "inr": target["inr"],
            "usd": target["usd"],
            "priority": health_priority,
            "source": target["source"],
            "source_url": target["source_url"],
            "reason": f"Upgrade from {name} ({int(vram)}MB) to {target['spec']} for better performance",
        })

    return items


def estimate_replacement_cost(scan_data, health_data=None):
    """
    Analyze scan data and health ratings to estimate hardware replacement costs.
    
    Returns: {
        "items": [{ "component", "current_spec", "recommended", "inr", "usd", "priority", "source", "source_url", "reason" }],
        "total_inr": float,
        "total_usd": float,
        "pricing_date": str,
        "currency_rate": float,
    }
    """
    items = []
    
    # Health-based priority mapping
    priorities = {}
    if health_data and "components" in health_data:
        for comp_name, comp_data in health_data["components"].items():
            if comp_data is None:
                continue
            if isinstance(comp_data, list):
                # For list components (e.g. multiple RAM sticks), use worst priority
                for item in comp_data:
                    if isinstance(item, dict):
                        flag = item.get("replacement", {}).get("flag", "good") if isinstance(item.get("replacement"), dict) else "good"
                        if flag in ("critical", "warning"):
                            priorities[comp_name.lower()] = flag
                            break
                priorities.setdefault(comp_name.lower(), "good")
            elif isinstance(comp_data, dict):
                flag = comp_data.get("replacement_flag", comp_data.get("replacement", {}).get("flag", "good") if isinstance(comp_data.get("replacement"), dict) else "good")
                priorities[comp_name.lower()] = flag
    
    # ── RAM Analysis ──
    ram = scan_data.get("ram", {})
    ram_gb = ram.get("total_gb", 0)
    modules = ram.get("modules", [])
    ram_type = modules[0].get("memory_type", "DDR4") if modules else "DDR4"
    
    ram_upgrade = _pick_ram_upgrade(ram_gb, ram_type)
    if ram_upgrade:
        priority = priorities.get("ram", "recommended")
        items.append({
            "component": "RAM",
            "current_spec": f"{ram_gb}GB {ram_type}",
            "recommended": ram_upgrade["spec"],
            "inr": ram_upgrade["inr"],
            "usd": ram_upgrade["usd"],
            "priority": priority,
            "source": ram_upgrade["source"],
            "source_url": ram_upgrade["source_url"],
            "reason": ram_upgrade["reason"],
        })
    
    # ── Storage Analysis ──
    storage = scan_data.get("storage", {})
    drives = storage.get("drives", [])
    if drives:
        primary = drives[0]
        storage_upgrade = _pick_storage_upgrade(
            primary.get("capacity_gb", 0),
            primary.get("media_type", "Unknown"),
            primary.get("interface", "SATA")
        )
        if storage_upgrade:
            priority = priorities.get("storage", "recommended")
            items.append({
                "component": "Storage",
                "current_spec": f"{primary.get('capacity_gb', '?')}GB {primary.get('media_type', '?')} ({primary.get('model', 'Unknown')})",
                "recommended": storage_upgrade["spec"],
                "inr": storage_upgrade["inr"],
                "usd": storage_upgrade["usd"],
                "priority": priority,
                "source": storage_upgrade["source"],
                "source_url": storage_upgrade["source_url"],
                "reason": storage_upgrade["reason"],
            })
    
    # ── CPU Analysis ──
    cpu = scan_data.get("cpu", {})
    cpu_upgrade = _pick_cpu_upgrade(
        cpu.get("cores"),
        cpu.get("frequency_mhz") or cpu.get("max_clock_speed_mhz"),
        cpu.get("brand", "")
    )
    if cpu_upgrade:
        priority = priorities.get("cpu", "recommended")
        items.append({
            "component": "CPU",
            "current_spec": f"{cpu.get('brand', 'Unknown')} ({cpu.get('cores', '?')} cores)",
            "recommended": cpu_upgrade["spec"],
            "inr": cpu_upgrade["inr"],
            "usd": cpu_upgrade["usd"],
            "priority": priority,
            "source": cpu_upgrade["source"],
            "source_url": cpu_upgrade["source_url"],
            "reason": cpu_upgrade["reason"],
        })
    
    # ── Battery Analysis ──
    battery = scan_data.get("battery", {})
    battery_upgrade = _pick_battery_upgrade(battery.get("percent"), battery.get("present", False))
    if battery_upgrade:
        items.append({
            "component": "Battery",
            "current_spec": f"{battery.get('percent', '?')}% health",
            "recommended": battery_upgrade["spec"],
            "inr": battery_upgrade["inr"],
            "usd": battery_upgrade["usd"],
            "priority": "critical",
            "source": battery_upgrade["source"],
            "source_url": battery_upgrade["source_url"],
            "reason": battery_upgrade["reason"],
        })

    # ── GPU Analysis ──
    gpus = scan_data.get("gpus", [])
    gpu_priority = priorities.get("gpu", "good")
    # Also check individual GPU health from health_data
    if health_data and "components" in health_data:
        gpu_health = health_data["components"].get("gpu", [])
        if isinstance(gpu_health, list):
            for gh in gpu_health:
                if isinstance(gh, dict):
                    flag = gh.get("replacement_flag", gh.get("replacement", {}).get("flag", "good") if isinstance(gh.get("replacement"), dict) else "good")
                    if flag in ("critical", "warning"):
                        gpu_priority = flag
                        break
    gpu_upgrades = _pick_gpu_upgrade(gpus, gpu_priority)
    items.extend(gpu_upgrades)
    
    # ── Motherboard / BIOS Analysis ──
    mb = scan_data.get("motherboard", {})
    bios_age = mb.get("bios_age_years", 0)
    if bios_age and bios_age > 6:
        mb_price = MOTHERBOARD_PRICES[0]  # Budget board
        items.append({
            "component": "Motherboard",
            "current_spec": f"{mb.get('manufacturer', '?')} {mb.get('product', '?')} (BIOS: {bios_age}yr old)",
            "recommended": mb_price["spec"],
            "inr": mb_price["inr"],
            "usd": mb_price["usd"],
            "priority": priorities.get("motherboard", "warning"),
            "source": mb_price["source"],
            "source_url": mb_price["source_url"],
            "reason": f"BIOS is {bios_age} years old — motherboard nearing end of life",
        })
    
    # ── Always recommend thermal paste if CPU health is warning/critical ──
    cpu_priority = priorities.get("cpu", "good")
    if cpu_priority in ("critical", "warning"):
        items.append({
            "component": "Maintenance",
            "current_spec": "Thermal Management",
            "recommended": MISC_PRICES[0]["spec"],
            "inr": MISC_PRICES[0]["inr"],
            "usd": MISC_PRICES[0]["usd"],
            "priority": "recommended",
            "source": MISC_PRICES[0]["source"],
            "source_url": MISC_PRICES[0]["source_url"],
            "reason": "Reapply thermal paste to improve CPU temperatures",
        })
    
    # Priority sort: critical > warning > recommended > good
    priority_order = {"critical": 0, "warning": 1, "recommended": 2, "good": 3}
    items.sort(key=lambda x: priority_order.get(x["priority"], 3))
    
    total_inr = sum(i["inr"] for i in items)
    total_usd = sum(i["usd"] for i in items)
    
    return {
        "items": items,
        "total_inr": total_inr,
        "total_usd": total_usd,
        "pricing_date": PRICING_LAST_UPDATED,
        "currency_rate": USD_TO_INR,
        "sources": [
            {"name": "Amazon.in", "url": "https://www.amazon.in"},
            {"name": "MDComputers", "url": "https://mdcomputers.in"},
            {"name": "PrimeABGB", "url": "https://www.primeabgb.com"},
            {"name": "Amazon.com", "url": "https://www.amazon.com"},
            {"name": "Newegg", "url": "https://www.newegg.com"},
        ],
        "needs_update": _pricing_needs_update(),
    }


def _pricing_needs_update():
    """Check if pricing database is older than the update interval."""
    try:
        last = datetime.datetime.strptime(PRICING_LAST_UPDATED, "%Y-%m-%d")
        age = (datetime.datetime.now() - last).days
        return age >= PRICING_UPDATE_INTERVAL_DAYS
    except Exception:
        return True


def get_all_prices():
    """Return all pricing categories for admin reference."""
    return {
        "ram": RAM_PRICES,
        "storage": STORAGE_PRICES,
        "cpu": CPU_PRICES,
        "gpu": GPU_PRICES,
        "motherboard": MOTHERBOARD_PRICES,
        "battery": BATTERY_PRICES,
        "misc": MISC_PRICES,
        "last_updated": PRICING_LAST_UPDATED,
        "update_interval_days": PRICING_UPDATE_INTERVAL_DAYS,
        "usd_to_inr": USD_TO_INR,
    }

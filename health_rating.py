"""
CatalystScan — Component Health Rating Engine
Scores each hardware component 0-100 with A-F grades,
replacement priority flags, and life extension recommendations.
"""

import datetime


# ── Reference Baselines (Modern 2024-2025 Standards) ──

MODERN_CPU_CORES = 8
MODERN_CPU_CLOCK_MHZ = 4500
MODERN_RAM_GB = 16
MODERN_DISK_SPEED_MBS = 500  # SSD sequential write
MODERN_GPU_VRAM_MB = 4096

# ── Life Extension Tips ──

LIFE_TIPS = {
    "cpu": [
        "Reapply thermal paste to reduce operating temperatures",
        "Clean CPU heatsink and fan to prevent thermal throttling",
        "Undervolt the CPU slightly if overheating is detected",
        "Ensure adequate case airflow with properly positioned fans",
    ],
    "ram": [
        "Run MemTest86 to verify memory stability and rule out bad sectors",
        "Ensure RAM is configured in dual-channel mode for optimal bandwidth",
        "Check for proper seating of DIMM modules in the slots",
        "Upgrade to higher-speed RAM modules if the motherboard supports it",
    ],
    "storage_hdd": [
        "Defragment the drive regularly to maintain read/write performance",
        "Monitor S.M.A.R.T. values weekly to detect early signs of failure",
        "Migrate the operating system to an SSD for a 3-5x speed improvement",
        "Avoid filling the drive beyond 85% to maintain performance",
    ],
    "storage_ssd": [
        "Enable TRIM support in the operating system for optimal endurance",
        "Avoid filling the SSD beyond 80% capacity to extend lifespan",
        "Update the SSD firmware from the manufacturer's website",
        "Monitor S.M.A.R.T. values for Total Bytes Written (TBW)",
    ],
    "gpu": [
        "Update GPU drivers to the latest stable version",
        "Clean GPU fans and heatsink to prevent thermal throttling",
        "Ensure adequate case airflow around the GPU area",
        "Reduce thermal load by adjusting fan curves in GPU management software",
    ],
    "motherboard": [
        "Update BIOS firmware to the latest version for compatibility fixes",
        "Visually inspect capacitors for bulging or leaking (sign of failure)",
        "Clean dust from all expansion slots and connectors",
        "Ensure all power connectors are firmly seated",
    ],
    "battery": [
        "Calibrate the battery every 3 months by fully charging and discharging",
        "Keep charge levels between 20-80% for daily use to extend cycle life",
        "Replace the battery if health drops below 40% of original capacity",
        "Avoid exposing the laptop to extreme temperatures (hot cars, direct sun)",
    ],
}


def calculate_age_score(age_years):
    """Score based on component age. Loses 15 points per year."""
    return max(0, min(100, 100 - (age_years * 15)))


def calculate_performance_score(actual, baseline):
    """Score as percentage of modern baseline."""
    if baseline <= 0:
        return 50
    score = (actual / baseline) * 100
    return max(0, min(100, round(score)))


def calculate_capacity_score(actual_gb, recommended_gb, minimum_gb):
    """Score based on meeting capacity requirements."""
    if actual_gb >= recommended_gb:
        return 100
    elif actual_gb >= minimum_gb:
        return 50
    else:
        return max(0, round((actual_gb / minimum_gb) * 40))


def get_grade(score):
    """Convert numerical score to letter grade."""
    if score >= 80:
        return "A"
    elif score >= 60:
        return "B"
    elif score >= 40:
        return "C"
    elif score >= 20:
        return "D"
    else:
        return "F"


def get_replacement_flag(grade):
    """Get replacement priority based on grade."""
    flags = {
        "A": {"flag": "OK", "icon": "✅", "action": "No action needed"},
        "B": {"flag": "OK", "icon": "✅", "action": "No action needed"},
        "C": {"flag": "MONITOR", "icon": "🟢", "action": "Plan replacement within 1 year"},
        "D": {"flag": "REPLACE_SOON", "icon": "🟡", "action": "Replace soon, degraded performance"},
        "F": {"flag": "REPLACE_NOW", "icon": "🔴", "action": "Immediate replacement required"},
    }
    return flags.get(grade, flags["C"])


def rate_cpu(cpu_data, benchmark_score=None):
    """Rate CPU health."""
    # Age score (from BIOS age as proxy if no direct CPU date)
    age_score = 70  # default if unknown

    # Performance score
    cores = cpu_data.get("cores", 2)
    clock = cpu_data.get("max_clock_speed_mhz", cpu_data.get("frequency_mhz", 2000))
    perf_metric = cores * clock
    baseline_metric = MODERN_CPU_CORES * MODERN_CPU_CLOCK_MHZ
    perf_score = calculate_performance_score(perf_metric, baseline_metric)

    if benchmark_score is not None:
        perf_score = min(100, round((perf_score + benchmark_score) / 2))

    # Capacity score (cores meeting modern needs)
    cap_score = calculate_capacity_score(cores, 6, 2)

    # Wear score (CPUs don't really wear, so give a neutral score)
    wear_score = 80

    total = round(age_score * 0.30 + perf_score * 0.30 + cap_score * 0.20 + wear_score * 0.20)
    grade = get_grade(total)

    return {
        "component": "CPU",
        "name": cpu_data.get("brand", "Unknown"),
        "part_number": cpu_data.get("processor_id", "N/A"),
        "score": total,
        "grade": grade,
        "replacement": get_replacement_flag(grade),
        "breakdown": {
            "age_score": round(age_score),
            "performance_score": round(perf_score),
            "capacity_score": round(cap_score),
            "wear_score": round(wear_score),
        },
        "life_tips": LIFE_TIPS["cpu"][:2] if grade in ["A", "B"] else LIFE_TIPS["cpu"],
    }


def rate_ram(ram_data):
    """Rate RAM health."""
    total_gb = ram_data.get("total_gb", 0)

    # Age score (RAM doesn't degrade much, neutral)
    age_score = 75

    # Performance score (speed-based if available)
    perf_score = 60
    modules = ram_data.get("modules", [])
    if modules:
        max_speed = max(m.get("speed_mhz", 0) for m in modules)
        perf_score = calculate_performance_score(max_speed, 3200)  # DDR4-3200 baseline

    # Capacity score
    cap_score = calculate_capacity_score(total_gb, MODERN_RAM_GB, 8)

    # Wear score
    wear_score = 85

    total = round(age_score * 0.30 + perf_score * 0.30 + cap_score * 0.20 + wear_score * 0.20)
    grade = get_grade(total)

    return {
        "component": "RAM",
        "name": f"{total_gb} GB ({len(modules)} modules)" if modules else f"{total_gb} GB",
        "part_number": modules[0].get("part_number", "N/A") if modules else "N/A",
        "score": total,
        "grade": grade,
        "replacement": get_replacement_flag(grade),
        "breakdown": {
            "age_score": round(age_score),
            "performance_score": round(perf_score),
            "capacity_score": round(cap_score),
            "wear_score": round(wear_score),
        },
        "life_tips": LIFE_TIPS["ram"][:2] if grade in ["A", "B"] else LIFE_TIPS["ram"],
    }


def rate_storage(storage_data, benchmark_disk_speed=None):
    """Rate storage health for each drive."""
    ratings = []
    drives = storage_data.get("drives", [])

    for drive in drives:
        media = drive.get("media_type", "Unknown").upper()
        is_ssd = "SSD" in media or "NVME" in media
        capacity_gb = drive.get("capacity_gb", 0)

        # Age score
        age_score = 60 if not is_ssd else 75

        # Performance score
        if benchmark_disk_speed:
            try:
                speed = float(str(benchmark_disk_speed).replace("MB/s", "").strip())
                perf_score = calculate_performance_score(speed, MODERN_DISK_SPEED_MBS)
            except (ValueError, TypeError):
                perf_score = 30 if not is_ssd else 70
        else:
            perf_score = 30 if not is_ssd else 70

        # Capacity score
        cap_score = calculate_capacity_score(capacity_gb, 512, 128)

        # Wear score (HDDs wear faster)
        wear_score = 50 if not is_ssd else 80

        total = round(age_score * 0.30 + perf_score * 0.30 + cap_score * 0.20 + wear_score * 0.20)
        grade = get_grade(total)
        tip_key = "storage_ssd" if is_ssd else "storage_hdd"

        ratings.append({
            "component": "Storage",
            "name": drive.get("model", "Unknown"),
            "part_number": drive.get("serial_number", "N/A"),
            "media_type": media,
            "score": total,
            "grade": grade,
            "replacement": get_replacement_flag(grade),
            "breakdown": {
                "age_score": round(age_score),
                "performance_score": round(perf_score),
                "capacity_score": round(cap_score),
                "wear_score": round(wear_score),
            },
            "life_tips": LIFE_TIPS[tip_key][:2] if grade in ["A", "B"] else LIFE_TIPS[tip_key],
        })

    return ratings


def rate_gpu(gpu_list):
    """Rate GPU health."""
    ratings = []
    for gpu in gpu_list:
        if gpu.get("error") or gpu.get("info"):
            continue

        vram = gpu.get("vram_mb", 0)
        name = gpu.get("name", "Unknown")

        # Age score from driver date
        age_score = 60
        driver_date = gpu.get("driver_date", "Unknown")
        if driver_date and driver_date != "Unknown":
            try:
                dd = datetime.datetime.strptime(driver_date, "%Y-%m-%d")
                driver_age = (datetime.datetime.now() - dd).days / 365.25
                age_score = calculate_age_score(driver_age)
            except Exception:
                pass

        # Performance score (VRAM based)
        perf_score = calculate_performance_score(vram, MODERN_GPU_VRAM_MB)

        # Capacity
        cap_score = calculate_capacity_score(vram, 4096, 1024)

        wear_score = 70

        total = round(age_score * 0.30 + perf_score * 0.30 + cap_score * 0.20 + wear_score * 0.20)
        grade = get_grade(total)

        ratings.append({
            "component": "GPU",
            "name": name,
            "part_number": gpu.get("video_processor", "N/A"),
            "score": total,
            "grade": grade,
            "replacement": get_replacement_flag(grade),
            "breakdown": {
                "age_score": round(age_score),
                "performance_score": round(perf_score),
                "capacity_score": round(cap_score),
                "wear_score": round(wear_score),
            },
            "life_tips": LIFE_TIPS["gpu"][:2] if grade in ["A", "B"] else LIFE_TIPS["gpu"],
        })

    return ratings


def rate_motherboard(mb_data):
    """Rate motherboard/BIOS health."""
    bios_age = mb_data.get("bios_age_years", 0)

    age_score = calculate_age_score(bios_age)
    perf_score = 65  # Neutral
    cap_score = 65   # Neutral
    wear_score = max(0, 100 - bios_age * 10)

    total = round(age_score * 0.30 + perf_score * 0.30 + cap_score * 0.20 + wear_score * 0.20)
    grade = get_grade(total)

    return {
        "component": "Motherboard",
        "name": f"{mb_data.get('manufacturer', 'Unknown')} {mb_data.get('product', '')}".strip(),
        "part_number": mb_data.get("serial_number", "N/A"),
        "bios_age_years": bios_age,
        "score": total,
        "grade": grade,
        "replacement": get_replacement_flag(grade),
        "breakdown": {
            "age_score": round(age_score),
            "performance_score": round(perf_score),
            "capacity_score": round(cap_score),
            "wear_score": round(wear_score),
        },
        "life_tips": LIFE_TIPS["motherboard"][:2] if grade in ["A", "B"] else LIFE_TIPS["motherboard"],
    }


def rate_battery(battery_data):
    """Rate battery health (laptops only)."""
    if not battery_data.get("present"):
        return None

    percent = battery_data.get("percent", 100)

    age_score = 60
    perf_score = percent
    cap_score = 100 if percent > 50 else percent * 2
    wear_score = percent

    total = round(age_score * 0.30 + perf_score * 0.30 + cap_score * 0.20 + wear_score * 0.20)
    grade = get_grade(total)

    return {
        "component": "Battery",
        "name": "Internal Battery",
        "part_number": "N/A",
        "score": total,
        "grade": grade,
        "replacement": get_replacement_flag(grade),
        "breakdown": {
            "age_score": round(age_score),
            "performance_score": round(perf_score),
            "capacity_score": round(cap_score),
            "wear_score": round(wear_score),
        },
        "life_tips": LIFE_TIPS["battery"][:2] if grade in ["A", "B"] else LIFE_TIPS["battery"],
    }


def calculate_overall_health(component_ratings):
    """Calculate overall system health from individual component ratings."""
    scores = [r["score"] for r in component_ratings if r is not None]
    if not scores:
        return {"score": 0, "grade": "F"}

    # Weighted: lowest-scored component drags the overall down
    avg_score = sum(scores) / len(scores)
    min_score = min(scores)
    # Overall = 60% average + 40% weakest link
    overall = round(avg_score * 0.6 + min_score * 0.4)
    grade = get_grade(overall)

    # Estimate lifespan
    if overall >= 80:
        lifespan = "3-5 years"
    elif overall >= 60:
        lifespan = "2-3 years"
    elif overall >= 40:
        lifespan = "1-2 years"
    elif overall >= 20:
        lifespan = "6-12 months"
    else:
        lifespan = "Immediate attention needed"

    # Top issues
    sorted_ratings = sorted(
        [r for r in component_ratings if r is not None],
        key=lambda x: x["score"]
    )
    top_issues = []
    for r in sorted_ratings[:3]:
        if r["score"] < 60:
            top_issues.append(f"{r['component']}: {r['grade']} ({r['score']}/100) — {r['replacement']['action']}")

    return {
        "score": overall,
        "grade": grade,
        "estimated_lifespan": lifespan,
        "top_issues": top_issues,
        "replacement": get_replacement_flag(grade),
    }


def rate_system(scan_data, benchmark_data=None):
    """Rate all components and calculate overall system health."""
    cpu_rating = rate_cpu(scan_data.get("cpu", {}),
                          benchmark_data.get("cpu_score") if benchmark_data else None)

    ram_rating = rate_ram(scan_data.get("ram", {}))

    disk_speed = benchmark_data.get("disk_write_speed") if benchmark_data else None
    storage_ratings = rate_storage(scan_data.get("storage", {}), disk_speed)

    gpu_ratings = rate_gpu(scan_data.get("gpus", []))

    mb_rating = rate_motherboard(scan_data.get("motherboard", {}))

    battery_rating = rate_battery(scan_data.get("battery", {}))

    all_ratings = [cpu_rating, ram_rating, mb_rating]
    if battery_rating:
        all_ratings.append(battery_rating)
    all_ratings.extend(storage_ratings)
    all_ratings.extend(gpu_ratings)

    overall = calculate_overall_health(all_ratings)

    return {
        "overall": overall,
        "components": {
            "cpu": cpu_rating,
            "ram": ram_rating,
            "storage": storage_ratings,
            "gpu": gpu_ratings,
            "motherboard": mb_rating,
            "battery": battery_rating,
        }
    }

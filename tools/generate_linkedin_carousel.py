from __future__ import annotations

import math
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "linkedin-carousel"

W, H = 1080, 1350

NAVY = "#0F2D3F"
DEEP = "#0B2232"
BLUE = "#0B8FD3"
CYAN = "#40C7D7"
GREEN = "#20A77B"
MINT = "#E9F9F4"
ICE = "#EAF7FC"
PAPER = "#F7FBFD"
INK = "#1D303C"
MUTED = "#5E7480"
WHITE = "#FFFFFF"
YELLOW = "#F8C64E"
RED = "#EF5B5B"
GRAY = "#DDE8EE"


def font(size: int, bold: bool = False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Helvetica.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(c, size=size)
    return ImageFont.load_default()


F_HERO = font(78, True)
F_TITLE = font(58, True)
F_SUB = font(34, False)
F_BODY = font(33, False)
F_BODY_B = font(33, True)
F_SMALL = font(24, False)
F_SMALL_B = font(24, True)
F_NUM = font(42, True)


def rounded_rect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text_size(draw, text, fnt):
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def draw_wrapped(draw, text, xy, fnt, fill=INK, max_width=880, line_gap=10, anchor=None):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test = word if not current else f"{current} {word}"
        if text_size(draw, test, fnt)[0] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)

    x, y = xy
    if anchor == "center":
        for line in lines:
            tw, th = text_size(draw, line, fnt)
            draw.text((x - tw / 2, y), line, font=fnt, fill=fill)
            y += th + line_gap
    else:
        for line in lines:
            draw.text((x, y), line, font=fnt, fill=fill)
            y += text_size(draw, line, fnt)[1] + line_gap
    return y


def bg(light=True):
    img = Image.new("RGB", (W, H), PAPER if light else NAVY)
    d = ImageDraw.Draw(img)
    if light:
        d.ellipse((-220, -150, 260, 330), fill=ICE)
        d.ellipse((790, -120, 1260, 350), fill="#DDF5FB")
        d.ellipse((835, 1030, 1210, 1420), fill="#E7F8F2")
    else:
        d.ellipse((735, -155, 1255, 365), fill=BLUE)
        d.ellipse((700, 110, 980, 390), fill=CYAN)
        d.ellipse((-180, 1080, 290, 1550), fill=GREEN)
    return img


def footer(draw, idx, total=9, dark=False):
    y = H - 88
    color = "#B8D1DB" if dark else MUTED
    draw.line((80, y, W - 80, y), fill="#2E5366" if dark else GRAY, width=2)
    draw.text((80, y + 24), "WaterFlow ERP", font=F_SMALL_B, fill=color)
    draw.text((W - 165, y + 24), f"{idx}/{total}", font=F_SMALL_B, fill=color)


def pill(draw, x, y, text, fill=ICE, text_fill=BLUE):
    tw, th = text_size(draw, text, F_SMALL_B)
    rounded_rect(draw, (x, y, x + tw + 42, y + 42), 21, fill)
    draw.text((x + 21, y + 9), text, font=F_SMALL_B, fill=text_fill)
    return x + tw + 54


def icon_circle(draw, cx, cy, color, label):
    draw.ellipse((cx - 42, cy - 42, cx + 42, cy + 42), fill=color)
    tw, th = text_size(draw, label, F_BODY_B)
    draw.text((cx - tw / 2, cy - th / 2 - 2), label, font=F_BODY_B, fill=WHITE)


def phone_mock(draw, x, y, w=330, h=610):
    rounded_rect(draw, (x, y, x + w, y + h), 42, "#122E42")
    rounded_rect(draw, (x + 18, y + 18, x + w - 18, y + h - 18), 32, WHITE)
    rounded_rect(draw, (x + 48, y + 54, x + w - 48, y + 90), 18, ICE)
    for i, col in enumerate([BLUE, GREEN, YELLOW]):
        draw.ellipse((x + 62 + i * 42, y + 61, x + 86 + i * 42, y + 85), fill=col)
    rounded_rect(draw, (x + 48, y + 125, x + w - 48, y + 215), 20, "#DFF5FB")
    draw.line((x + 76, y + 170, x + w - 76, y + 170), fill=BLUE, width=6)
    for i in range(4):
        yy = y + 250 + i * 72
        rounded_rect(draw, (x + 48, yy, x + w - 48, yy + 48), 18, "#F2F8FB")
        draw.ellipse((x + 65, yy + 13, x + 87, yy + 35), fill=GREEN if i % 2 == 0 else BLUE)


def map_graphic(draw, x, y, w=450, h=390):
    rounded_rect(draw, (x, y, x + w, y + h), 32, "#EAF7FC")
    for i in range(5):
        yy = y + 45 + i * 65
        draw.line((x + 28, yy, x + w - 28, yy + 40), fill="#C5E8F3", width=5)
    for i, (px, py, col) in enumerate([(90, 96, RED), (250, 185, BLUE), (350, 295, GREEN)]):
        draw.ellipse((x + px - 20, y + py - 20, x + px + 20, y + py + 20), fill=col)
        draw.polygon([(x + px, y + py + 32), (x + px - 12, y + py + 13), (x + px + 12, y + py + 13)], fill=col)
    draw.line((x + 90, y + 96, x + 250, y + 185, x + 350, y + 295), fill=NAVY, width=6)


def slide_cover():
    img = bg(False)
    d = ImageDraw.Draw(img)
    d.text((85, 170), "From Diary", font=F_HERO, fill=WHITE)
    d.text((85, 255), "to Digital ERP", font=F_HERO, fill=WHITE)
    d.rectangle((85, 360, 520, 366), fill=CYAN)
    draw_wrapped(
        d,
        "How WaterFlow ERP helps water distributors manage delivery, billing, CRM, tracking, reminders and AI-powered daily operations.",
        (85, 420),
        F_SUB,
        fill="#D7EEF6",
        max_width=760,
        line_gap=13,
    )
    pill(d, 85, 650, "Live Tracking", "#173E54", "#BDEEF8")
    pill(d, 315, 650, "Billing CRM", "#173E54", "#BDEEF8")
    pill(d, 85, 715, "AI Use Cases", "#173E54", "#BDEEF8")
    phone_mock(d, 680, 680, 290, 540)
    footer(d, 1, dark=True)
    return img


def slide_problem():
    img = bg(True)
    d = ImageDraw.Draw(img)
    d.text((80, 105), "The Real Problem", font=F_TITLE, fill=NAVY)
    draw_wrapped(d, "Most local water distributors still run daily operations with pen, diary, phone calls and hard-copy bills.", (80, 190), F_SUB, max_width=890, fill=INK)
    y = 390
    items = [
        ("01", "Who needs delivery today?"),
        ("02", "Who skipped or paused service?"),
        ("03", "Which driver covers which area?"),
        ("04", "Who has pending payment?"),
        ("05", "How many filled campers are available?"),
    ]
    for num, txt in items:
        rounded_rect(d, (80, y, 1000, y + 92), 24, WHITE, "#DCEAF0", 2)
        icon_circle(d, 135, y + 46, RED if num in ["04", "05"] else BLUE, num)
        d.text((200, y + 27), txt, font=F_BODY_B, fill=INK)
        y += 116
    footer(d, 2)
    return img


def slide_solution():
    img = bg(True)
    d = ImageDraw.Draw(img)
    d.text((80, 105), "WaterFlow ERP", font=F_TITLE, fill=NAVY)
    draw_wrapped(d, "One simple system for customers, drivers, orders, inventory, billing, payments, notifications and reports.", (80, 188), F_SUB, max_width=900)
    cards = [
        ("CRM", "Customer profiles, schedules, rates and history", BLUE),
        ("MAP", "Location-based areas, routes and live activity", GREEN),
        ("BILL", "Digital invoices, dues and online payments", CYAN),
        ("AI", "Smart reminders, summaries and predictions", YELLOW),
    ]
    positions = [(80, 390), (570, 390), (80, 710), (570, 710)]
    for (title, desc, col), (x, y) in zip(cards, positions):
        rounded_rect(d, (x, y, x + 430, y + 250), 28, WHITE, "#DDE8EE", 2)
        icon_circle(d, x + 70, y + 72, col, title[:2])
        d.text((x + 130, y + 45), title, font=F_BODY_B, fill=NAVY)
        draw_wrapped(d, desc, (x + 42, y + 128), F_BODY, max_width=340, fill=MUTED, line_gap=8)
    footer(d, 3)
    return img


def slide_tracking():
    img = bg(True)
    d = ImageDraw.Draw(img)
    d.text((80, 95), "Live Tracking + Map", font=F_TITLE, fill=NAVY)
    draw_wrapped(d, "Know where the work is happening. See customers, drivers, service areas and delivery progress visually.", (80, 180), F_SUB, max_width=860)
    map_graphic(d, 80, 390, 480, 430)
    x = 610
    y = 405
    bullets = [
        "Driver route visibility",
        "Customer location mapping",
        "Area and pincode coverage",
        "Delivery status updates",
        "Better dispatch decisions",
    ]
    for b in bullets:
        d.ellipse((x, y + 10, x + 18, y + 28), fill=BLUE)
        y = draw_wrapped(d, b, (x + 36, y), F_BODY_B, max_width=380, fill=INK, line_gap=4) + 24
    rounded_rect(d, (80, 910, 1000, 1075), 32, NAVY)
    draw_wrapped(d, "Result: less calling, less confusion, faster delivery coordination.", (130, 948), F_SUB, max_width=820, fill=WHITE)
    footer(d, 4)
    return img


def slide_billing_crm():
    img = bg(True)
    d = ImageDraw.Draw(img)
    d.text((80, 95), "Billing CRM", font=F_TITLE, fill=NAVY)
    draw_wrapped(d, "Every customer record becomes digital: schedule, rate, deposit, invoices, payments, dues and service history.", (80, 180), F_SUB, max_width=880)
    rounded_rect(d, (80, 365, 1000, 990), 34, WHITE, "#DDE8EE", 2)
    d.text((130, 420), "Customer: Ravi Kumar", font=F_BODY_B, fill=NAVY)
    d.text((130, 472), "Area: Kothrud  |  Plan: Daily", font=F_BODY, fill=MUTED)
    rows = [
        ("Rate per camper", "Rs. 30"),
        ("Monthly invoice", "Generated"),
        ("Payment status", "Pending"),
        ("Reminder", "Auto scheduled"),
        ("Delivery history", "Available"),
    ]
    y = 555
    for k, v in rows:
        d.line((130, y - 18, 950, y - 18), fill="#E7EEF2", width=2)
        d.text((130, y), k, font=F_BODY, fill=INK)
        d.text((720, y), v, font=F_BODY_B, fill=BLUE if v != "Pending" else RED)
        y += 68
    rounded_rect(d, (130, 885, 950, 945), 22, ICE)
    d.text((160, 903), "No more searching old diary pages for payment history.", font=F_SMALL_B, fill=NAVY)
    footer(d, 5)
    return img


def slide_notifications():
    img = bg(True)
    d = ImageDraw.Draw(img)
    d.text((80, 95), "Notifications & Reminders", font=F_TITLE, fill=NAVY)
    draw_wrapped(d, "The system keeps customers, drivers and admins updated without manual follow-up every time.", (80, 180), F_SUB, max_width=880)
    notifications = [
        ("Customer", "Bill generated. Payment due on Friday.", GREEN),
        ("Driver", "You have 38 deliveries assigned today.", BLUE),
        ("Admin", "Low filled-camper stock alert.", RED),
        ("Customer", "Your delivery is marked completed.", CYAN),
    ]
    y = 380
    for who, msg, col in notifications:
        rounded_rect(d, (100, y, 980, y + 125), 34, WHITE, "#DDE8EE", 2)
        icon_circle(d, 165, y + 62, col, who[0])
        d.text((230, y + 30), who, font=F_SMALL_B, fill=col)
        d.text((230, y + 65), msg, font=F_BODY_B, fill=INK)
        y += 150
    footer(d, 6)
    return img


def slide_ai():
    img = bg(False)
    d = ImageDraw.Draw(img)
    d.text((80, 105), "Where AI Helps", font=F_TITLE, fill=WHITE)
    draw_wrapped(d, "AI can turn daily business data into simple actions for local distributors.", (80, 190), F_SUB, max_width=850, fill="#D7EEF6")
    items = [
        "Predict customers likely to delay payment",
        "Suggest best driver route by area and workload",
        "Detect unusual inventory movement",
        "Create daily summary for admin",
        "Answer questions like: who has pending bills in Kothrud?",
    ]
    y = 382
    for i, item in enumerate(items, 1):
        rounded_rect(d, (80, y, 1000, y + 118), 28, "#153C52", "#245F78", 2)
        icon_circle(d, 140, y + 59, CYAN if i % 2 else GREEN, str(i))
        draw_wrapped(d, item, (210, y + 30), font(30, True), max_width=720, fill=WHITE, line_gap=5)
        y += 137
    footer(d, 7, dark=True)
    return img


def slide_users():
    img = bg(True)
    d = ImageDraw.Draw(img)
    d.text((80, 95), "Built for Everyone", font=F_TITLE, fill=NAVY)
    roles = [
        ("Admin", "Manage customers, drivers, orders, billing, inventory and reports.", BLUE),
        ("Driver", "View daily worklist, customer locations and update delivery status.", GREEN),
        ("Customer", "View bills, pay online, order extra campers and get reminders.", CYAN),
    ]
    y = 260
    for role, desc, col in roles:
        rounded_rect(d, (80, y, 1000, y + 235), 34, WHITE, "#DDE8EE", 2)
        icon_circle(d, 160, y + 82, col, role[0])
        d.text((250, y + 48), role, font=F_TITLE, fill=NAVY)
        draw_wrapped(d, desc, (250, y + 122), F_BODY, max_width=660, fill=MUTED)
        y += 275
    footer(d, 8)
    return img


def slide_result():
    img = bg(False)
    d = ImageDraw.Draw(img)
    d.text((80, 105), "The Outcome", font=F_TITLE, fill=WHITE)
    draw_wrapped(d, "Less paperwork. Fewer mistakes. Faster collections. Better customer service. Complete control over daily operations.", (80, 190), F_SUB, max_width=850, fill="#D7EEF6")
    metrics = [
        ("Less", "Paperwork"),
        ("Faster", "Billing"),
        ("Smarter", "Reminders"),
        ("Better", "Tracking"),
    ]
    positions = [(95, 425), (575, 425), (95, 735), (575, 735)]
    for (a, b), (x, y) in zip(metrics, positions):
        rounded_rect(d, (x, y, x + 410, y + 230), 34, "#153C52", "#245F78", 2)
        d.text((x + 42, y + 55), a, font=F_TITLE, fill=CYAN)
        d.text((x + 42, y + 125), b, font=F_BODY_B, fill=WHITE)
    rounded_rect(d, (80, 1045, 1000, 1148), 34, WHITE)
    draw_wrapped(
        d,
        "WaterFlow ERP: from manual work to intelligent operations.",
        (540, 1074),
        font(30, True),
        max_width=820,
        fill=NAVY,
        anchor="center",
        line_gap=3,
    )
    footer(d, 9, dark=True)
    return img


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    slides = [
        slide_cover(),
        slide_problem(),
        slide_solution(),
        slide_tracking(),
        slide_billing_crm(),
        slide_notifications(),
        slide_ai(),
        slide_users(),
        slide_result(),
    ]
    for i, slide in enumerate(slides, 1):
        path = OUT_DIR / f"waterflow-linkedin-carousel-{i:02d}.png"
        slide.save(path, quality=95)
        print(path)


if __name__ == "__main__":
    main()

from __future__ import annotations

import html
import re
import textwrap
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    KeepTogether,
    ListFlowable,
    ListItem,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "PROJECT_DESCRIPTION.md"
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT = OUTPUT_DIR / "WaterFlow_ERP_Project_Description.pdf"

PAGE_WIDTH, PAGE_HEIGHT = A4

NAVY = colors.HexColor("#123047")
BLUE = colors.HexColor("#0E8DD3")
CYAN = colors.HexColor("#41C7D8")
GREEN = colors.HexColor("#1FA37A")
INK = colors.HexColor("#24313A")
MUTED = colors.HexColor("#667985")
LIGHT_BLUE = colors.HexColor("#EAF7FC")
LIGHT_GREEN = colors.HexColor("#EAF8F2")
LIGHT_GRAY = colors.HexColor("#F4F7F9")
MID_GRAY = colors.HexColor("#D9E4EA")
WHITE = colors.white


class CoverCanvas:
    def __init__(self, canvas, doc):
        self.canvas = canvas
        self.doc = doc

    def draw(self):
        c = self.canvas
        c.saveState()
        c.setFillColor(NAVY)
        c.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)

        c.setFillColor(BLUE)
        c.circle(PAGE_WIDTH - 20 * mm, PAGE_HEIGHT - 25 * mm, 42 * mm, stroke=0, fill=1)
        c.setFillColor(CYAN)
        c.circle(PAGE_WIDTH - 50 * mm, PAGE_HEIGHT - 45 * mm, 22 * mm, stroke=0, fill=1)
        c.setFillColor(GREEN)
        c.circle(15 * mm, 18 * mm, 40 * mm, stroke=0, fill=1)

        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 30)
        c.drawString(22 * mm, PAGE_HEIGHT - 58 * mm, "WaterFlow ERP")
        c.setFont("Helvetica", 15)
        c.setFillColor(colors.HexColor("#D8F3FA"))
        c.drawString(22 * mm, PAGE_HEIGHT - 70 * mm, "Complete Project Description")

        c.setStrokeColor(CYAN)
        c.setLineWidth(2)
        c.line(22 * mm, PAGE_HEIGHT - 82 * mm, 105 * mm, PAGE_HEIGHT - 82 * mm)

        c.setFont("Helvetica", 10)
        c.setFillColor(colors.HexColor("#C7DBE5"))
        lines = [
            "Architecture, functionality, backend modules, mobile app,",
            "admin dashboard, database design, business flows, setup,",
            "deployment, CI/CD, and production notes.",
        ]
        y = PAGE_HEIGHT - 100 * mm
        for line in lines:
            c.drawString(22 * mm, y, line)
            y -= 7 * mm

        c.setFillColor(colors.HexColor("#BFEAF3"))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(22 * mm, 32 * mm, "Generated from PROJECT_DESCRIPTION.md")
        c.setFont("Helvetica", 8)
        c.drawString(22 * mm, 26 * mm, "Water distribution management system handover document")
        c.restoreState()


class SectionBand(Flowable):
    def __init__(self, title: str, subtitle: str = ""):
        super().__init__()
        self.title = title
        self.subtitle = subtitle
        self.width = 0
        self.height = 24 * mm if subtitle else 18 * mm
        self.available_width = 170 * mm

    def wrap(self, availWidth, availHeight):
        self.available_width = availWidth
        return availWidth, self.height

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(LIGHT_BLUE)
        c.roundRect(0, 0, self.available_width, self.height, 4, stroke=0, fill=1)
        c.setFillColor(BLUE)
        c.rect(0, 0, 3 * mm, self.height, stroke=0, fill=1)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 15)
        c.drawString(7 * mm, self.height - 8 * mm, self.title[:78])
        if self.subtitle:
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 8.5)
            c.drawString(7 * mm, self.height - 15 * mm, self.subtitle[:100])
        c.restoreState()


class Rule(Flowable):
    def __init__(self, color=MID_GRAY, thickness=0.7):
        super().__init__()
        self.height = 3 * mm
        self.color = color
        self.thickness = thickness

    def draw(self):
        self.canv.saveState()
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, self.height / 2, self._availWidth, self.height / 2)
        self.canv.restoreState()


def normal_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(WHITE)
    canvas.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, stroke=0, fill=1)

    canvas.setFillColor(LIGHT_GRAY)
    canvas.rect(0, PAGE_HEIGHT - 18 * mm, PAGE_WIDTH, 18 * mm, stroke=0, fill=1)
    canvas.setFillColor(BLUE)
    canvas.rect(0, PAGE_HEIGHT - 18 * mm, 8 * mm, 18 * mm, stroke=0, fill=1)
    canvas.setFillColor(NAVY)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(14 * mm, PAGE_HEIGHT - 11 * mm, "WaterFlow ERP - Project Description")

    canvas.setStrokeColor(MID_GRAY)
    canvas.setLineWidth(0.5)
    canvas.line(14 * mm, 14 * mm, PAGE_WIDTH - 14 * mm, 14 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(14 * mm, 8.5 * mm, "Confidential project handover document")
    canvas.drawRightString(PAGE_WIDTH - 14 * mm, 8.5 * mm, f"Page {doc.page}")
    canvas.restoreState()


def cover_page(canvas, doc):
    CoverCanvas(canvas, doc).draw()


def make_styles():
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "TitleCustom",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=27,
            textColor=NAVY,
            alignment=TA_CENTER,
            spaceAfter=8 * mm,
        ),
        "h2": ParagraphStyle(
            "H2Custom",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13.5,
            leading=17,
            textColor=NAVY,
            spaceBefore=6 * mm,
            spaceAfter=3 * mm,
            keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "H3Custom",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=10.8,
            leading=14,
            textColor=BLUE,
            spaceBefore=4 * mm,
            spaceAfter=2 * mm,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "BodyCustom",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.2,
            leading=13.2,
            textColor=INK,
            spaceAfter=2.2 * mm,
            alignment=TA_LEFT,
        ),
        "bullet": ParagraphStyle(
            "BulletCustom",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9,
            leading=12.6,
            textColor=INK,
            leftIndent=0,
            spaceAfter=1.3 * mm,
        ),
        "code": ParagraphStyle(
            "CodeCustom",
            parent=base["Code"],
            fontName="Courier",
            fontSize=7.2,
            leading=9.1,
            textColor=colors.HexColor("#20303A"),
            backColor=colors.HexColor("#F2F8FB"),
            borderColor=colors.HexColor("#C9E5EF"),
            borderWidth=0.5,
            borderPadding=5,
            leftIndent=0,
            rightIndent=0,
            spaceBefore=2 * mm,
            spaceAfter=3 * mm,
        ),
        "caption": ParagraphStyle(
            "CaptionCustom",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
    }
    return styles


def clean_text(text: str) -> str:
    replacements = {
        "—": "-",
        "–": "-",
        "→": "->",
        "←": "<-",
        "·": "-",
        "’": "'",
        "“": '"',
        "”": '"',
        "├": "|",
        "└": "`",
        "│": "|",
        "─": "-",
        "┌": "+",
        "┐": "+",
        "┘": "+",
        "┬": "+",
        "┴": "+",
        "┼": "+",
        "▼": "v",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def inline_markup(text: str) -> str:
    text = clean_text(text)
    text = html.escape(text)
    text = re.sub(r"`([^`]+)`", r"<font name='Courier' color='#0E6EA4'>\1</font>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    return text


def build_toc(lines: list[str], styles) -> list:
    headings = []
    for line in lines:
        if line.startswith("## ") and not line.startswith("### "):
            headings.append(clean_text(line[3:].strip()))
    data = []
    for item in headings:
        number, _, title = item.partition(". ")
        label = title if title else item
        data.append([Paragraph(f"<b>{html.escape(number)}</b>", styles["body"]), Paragraph(html.escape(label), styles["body"])])
    table = Table(data, colWidths=[14 * mm, 145 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TEXTCOLOR", (0, 0), (0, -1), BLUE),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.HexColor("#EDF3F6")),
            ]
        )
    )
    return [
        SectionBand("Contents", "A quick map of the project description"),
        Spacer(1, 4 * mm),
        table,
        PageBreak(),
    ]


def wrap_code(code: str) -> str:
    out = []
    for line in clean_text(code).splitlines():
        if len(line) <= 92:
            out.append(line)
        else:
            out.extend(textwrap.wrap(line, width=92, subsequent_indent="  ", break_long_words=False) or [""])
    return "\n".join(out)


def flush_paragraph(buffer: list[str], story: list, styles):
    if not buffer:
        return
    text = " ".join(part.strip() for part in buffer if part.strip())
    if text:
        story.append(Paragraph(inline_markup(text), styles["body"]))
    buffer.clear()


def flush_bullets(buffer: list[str], story: list, styles):
    if not buffer:
        return
    items = [
        ListItem(Paragraph(inline_markup(item), styles["bullet"]), leftIndent=8)
        for item in buffer
    ]
    story.append(
        ListFlowable(
            items,
            bulletType="bullet",
            start="circle",
            leftIndent=12,
            bulletFontName="Helvetica",
            bulletFontSize=6,
            bulletColor=BLUE,
            spaceAfter=2 * mm,
        )
    )
    buffer.clear()


def build_story(markdown: str):
    styles = make_styles()
    raw_lines = markdown.splitlines()
    story = []

    story.append(NextPageTemplate("Normal"))
    story.append(PageBreak())
    story.extend(build_toc(raw_lines, styles))

    para_buffer: list[str] = []
    bullet_buffer: list[str] = []
    code_buffer: list[str] = []
    in_code = False

    for raw in raw_lines:
        line = raw.rstrip()
        stripped = line.strip()

        if stripped.startswith("```"):
            if in_code:
                code = wrap_code("\n".join(code_buffer))
                story.append(Preformatted(code, styles["code"], maxLineLength=92))
                code_buffer.clear()
                in_code = False
            else:
                flush_paragraph(para_buffer, story, styles)
                flush_bullets(bullet_buffer, story, styles)
                in_code = True
            continue

        if in_code:
            code_buffer.append(line)
            continue

        if not stripped:
            flush_paragraph(para_buffer, story, styles)
            flush_bullets(bullet_buffer, story, styles)
            continue

        if stripped.startswith("# "):
            flush_paragraph(para_buffer, story, styles)
            flush_bullets(bullet_buffer, story, styles)
            continue

        if stripped.startswith("## "):
            flush_paragraph(para_buffer, story, styles)
            flush_bullets(bullet_buffer, story, styles)
            title = clean_text(stripped[3:])
            subtitle = ""
            if ". " in title:
                number, _, rest = title.partition(". ")
                subtitle = f"Section {number}"
                title = rest
            story.append(SectionBand(title, subtitle))
            story.append(Spacer(1, 2.5 * mm))
            continue

        if stripped.startswith("### "):
            flush_paragraph(para_buffer, story, styles)
            flush_bullets(bullet_buffer, story, styles)
            story.append(Paragraph(inline_markup(stripped[4:]), styles["h3"]))
            continue

        if stripped.startswith("- "):
            flush_paragraph(para_buffer, story, styles)
            bullet_buffer.append(stripped[2:])
            continue

        if re.match(r"^\d+\.\s+", stripped):
            flush_paragraph(para_buffer, story, styles)
            bullet_buffer.append(re.sub(r"^\d+\.\s+", "", stripped))
            continue

        if stripped == "---":
            flush_paragraph(para_buffer, story, styles)
            flush_bullets(bullet_buffer, story, styles)
            story.append(Rule())
            continue

        para_buffer.append(stripped)

    flush_paragraph(para_buffer, story, styles)
    flush_bullets(bullet_buffer, story, styles)
    return story


def build_pdf():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    markdown = SOURCE.read_text(encoding="utf-8")

    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=24 * mm,
        bottomMargin=18 * mm,
        title="WaterFlow ERP - Complete Project Description",
        author="WaterFlow ERP",
    )

    normal_frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="normal",
        showBoundary=0,
    )
    cover_frame = Frame(0, 0, PAGE_WIDTH, PAGE_HEIGHT, id="cover", showBoundary=0)
    doc.addPageTemplates(
        [
            PageTemplate(id="Cover", frames=[cover_frame], onPage=cover_page),
            PageTemplate(id="Normal", frames=[normal_frame], onPage=normal_page),
        ]
    )

    story = build_story(markdown)
    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build_pdf()

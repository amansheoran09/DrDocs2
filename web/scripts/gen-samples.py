"""Synthetic specimen ID cards (known ground-truth, no real PII) for OCR tests.
Single-column, label-and-value layout that mirrors how real cards read top to
bottom — values are on the same line as their label or directly below."""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = "/tmp/ocrsamples"
F = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FB = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

def font(sz, bold=False):
    return ImageFont.truetype(FB if bold else F, sz)

def card(w=1000, h=640, bg=(255, 255, 255)):
    img = Image.new("RGB", (w, h), bg)
    return img, ImageDraw.Draw(img)

def t(d, y, s, sz=30, bold=False, x=60, fill=(0, 0, 0)):
    d.text((x, y), s, font=font(sz, bold), fill=fill)

# 1) Aadhaar
img, d = card()
d.rectangle([0, 0, 1000, 80], fill=(255, 153, 51))
t(d, 22, "Government of India", 34, True, 120, (255, 255, 255))
t(d, 150, "Aman Sharma", 40, True)
t(d, 220, "DOB : 24/12/2006", 32)
t(d, 280, "Male", 30)
t(d, 400, "6826 2961 0773", 56, True)
d.rectangle([0, 560, 1000, 640], fill=(19, 136, 8))
t(d, 580, "Aadhaar - Aam Aadmi ka Adhikar", 26, True, 280, (255, 255, 255))
img.save(f"{OUT}/aadhaar.png")

# 2) PAN
img, d = card(bg=(225, 235, 245))
t(d, 30, "INCOME TAX DEPARTMENT", 34, True, 60, (10, 40, 90))
t(d, 110, "Permanent Account Number", 26)
t(d, 200, "ABCPS1234K", 52, True)
t(d, 320, "Name : AMAN SHARMA", 36, True)
t(d, 390, "Father's Name : RAJESH SHARMA", 30)
t(d, 470, "Date of Birth : 24/12/2006", 34, True)
img.save(f"{OUT}/pan.png")

# 3) Passport
img, d = card(bg=(245, 240, 230))
t(d, 30, "REPUBLIC OF INDIA  -  PASSPORT", 32, True, 60, (60, 20, 20))
t(d, 150, "Surname : SHARMA", 34, True)
t(d, 220, "Given Name(s) : AMAN", 34, True)
t(d, 300, "Date of Birth : 24/12/2006", 32)
t(d, 370, "Date of Issue : 15/08/2021", 32)
t(d, 440, "Date of Expiry : 14/08/2031", 32)
t(d, 520, "Passport No. : P1234567", 32, True)
img.save(f"{OUT}/passport.png")

# 4) Driving License
img, d = card(bg=(235, 245, 235))
d.rectangle([0, 0, 1000, 80], fill=(40, 90, 50))
t(d, 22, "DRIVING LICENCE", 34, True, 60, (255, 255, 255))
t(d, 140, "DL No : HR26 20110012345", 34, True)
t(d, 230, "Name : AMAN SHARMA", 34, True)
t(d, 310, "Date of Birth : 24/12/2006", 32)
t(d, 390, "Valid Till : 23/12/2026", 32, True)
t(d, 470, "Issue Date : 24/12/2006", 30)
img.save(f"{OUT}/driving_license.png")

# 5) Voter ID
img, d = card(bg=(250, 250, 245))
t(d, 30, "Election Commission of India", 32, True, 180, (120, 30, 30))
t(d, 80, "Elector Photo Identity Card", 24, False, 300)
t(d, 190, "ABC1234567", 46, True)
t(d, 300, "Elector's Name : AMAN SHARMA", 34, True)
t(d, 380, "Father's Name : RAJESH SHARMA", 30)
t(d, 470, "Date of Birth : 24/12/2006", 32)
img.save(f"{OUT}/voter_id.png")

# 6) Student ID (other)
img, d = card()
d.rectangle([0, 0, 1000, 100], fill=(90, 60, 40))
t(d, 18, "Indian Institute of Technology", 30, True, 250, (255, 255, 255))
t(d, 58, "STUDENT IDENTITY CARD", 24, True, 320, (255, 255, 255))
t(d, 160, "Name", 26, False, 340, (120, 40, 40))
t(d, 195, "AMAN SHARMA", 36, True, 340)
t(d, 280, "Roll Number", 26, False, 340, (120, 40, 40))
t(d, 315, "240097", 36, True, 340)
t(d, 400, "Date of Birth : 24-12-2006", 32, False, 340)
t(d, 480, "Valid Until : 31-07-2028", 32, False, 340)
img.save(f"{OUT}/student.png")

print("generated:", sorted(f for f in os.listdir(OUT) if f.endswith(".png")))

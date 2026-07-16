import re

with open('components/humanify/HumanifyWelcomePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

hero_bg = '''          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.05]"
              style={{ backgroundImage: "url('/images/humanify-hero-bg.png')" }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)]" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0812]/20 via-[#0a0812]/80 to-[#0a0812]" />
          </div>'''

content = re.sub(
    r'<div className="pointer-events-none absolute inset-0" aria-hidden>.*?</div>\s*</div>',
    hero_bg,
    content,
    flags=re.DOTALL
)

with open('components/humanify/HumanifyWelcomePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

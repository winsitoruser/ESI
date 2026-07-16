import re

with open('components/humanify/HumanifyWelcomePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Layout & Background
content = content.replace('bg-slate-50 text-slate-800', 'bg-[#0a0812] text-white')
content = re.sub(
    r'<div className="absolute inset-0 bg-\[linear-gradient.*?</div>\s*<div className="absolute top-0 right-0 h-\[420px\] w-\[420px\] rounded-full bg-blue-100/40 blur-3xl" />\s*<div className="absolute bottom-0 left-0 h-\[320px\] w-\[320px\] rounded-full bg-slate-200/50 blur-3xl" />',
    r'<div className="absolute top-[-10%] right-[15%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px]" />\n        <div className="absolute bottom-[-5%] left-[5%] w-[450px] h-[450px] bg-fuchsia-600/15 rounded-full blur-[100px]" />',
    content,
    flags=re.DOTALL
)

# Header
content = content.replace('border-slate-200/90 bg-white/95', 'border-white/[0.08] bg-[#0a0812]/80')
content = content.replace('text-slate-800', 'text-white')
content = content.replace('text-slate-500', 'text-violet-200/60')
content = content.replace('text-slate-600', 'text-violet-200/80')
content = content.replace('text-slate-900', 'text-white')
content = content.replace('text-blue-700', 'text-fuchsia-400')
content = content.replace('text-blue-600', 'text-violet-400')
content = content.replace('text-blue-800', 'text-fuchsia-300')
content = content.replace('bg-blue-600', 'bg-violet-600')
content = content.replace('bg-blue-700', 'bg-violet-500')
content = content.replace('bg-white', 'bg-white/[0.03]')
content = content.replace('border-slate-200/80', 'border-white/[0.08]')
content = content.replace('border-slate-200/90', 'border-white/[0.08]')
content = content.replace('border-slate-200', 'border-white/[0.08]')
content = content.replace('border-slate-300', 'border-white/[0.15]')
content = content.replace('bg-slate-50/50', 'bg-white/[0.02]')
content = content.replace('bg-slate-50/95', 'bg-[#0a0812]/95')
content = content.replace('bg-slate-50', 'bg-white/[0.02]')
content = content.replace('bg-slate-100/60', 'bg-white/[0.02]')
content = content.replace('bg-slate-100/80', 'bg-fuchsia-500/10')
content = content.replace('bg-slate-100', 'bg-white/[0.05]')
content = content.replace('bg-slate-200', 'bg-white/[0.1]')
content = content.replace('border-blue-100', 'border-violet-500/20')
content = content.replace('border-blue-200', 'border-violet-500/30')
content = content.replace('text-slate-400', 'text-violet-200/40')
content = content.replace('text-blue-400/70', 'text-fuchsia-400/70')

# Specific fixes
content = content.replace('bg-white/[0.03]/95', 'bg-[#0a0812]/95')
content = content.replace('bg-gradient-to-b from-white/90 via-slate-50/95 to-slate-50', 'bg-gradient-to-b from-[#0a0812]/90 via-[#0a0812]/95 to-[#0a0812]')
content = content.replace('from-white/[0.03]/90 via-white/[0.02]/95 to-white/[0.02]', 'bg-gradient-to-b from-[#0a0812]/90 via-[#0a0812]/95 to-[#0a0812]')
content = content.replace('from-slate-100', 'from-[#0a0812]')
content = content.replace('from-white/[0.05]', 'from-[#0a0812]')
content = content.replace('bg-gradient-to-br from-blue-50 via-white to-slate-50', 'bg-gradient-to-br from-violet-500/10 via-[#0a0812] to-fuchsia-500/10')
content = content.replace('bg-gradient-to-br from-violet-500/10 via-white/[0.03] to-white/[0.02]', 'bg-gradient-to-br from-violet-500/10 via-[#0a0812] to-fuchsia-500/10')
content = content.replace('bg-blue-100/50', 'bg-violet-500/20')
content = content.replace('text-slate-100', 'text-white/5')
content = content.replace('text-white/[0.05]', 'text-white/5')
content = content.replace('text-blue-50', 'text-violet-500/10')
content = content.replace('bg-blue-50', 'bg-violet-500/10')
content = content.replace('text-blue-500', 'text-fuchsia-400')

with open('components/humanify/HumanifyWelcomePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

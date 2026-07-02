import React from 'react';
import { WidgetInstance } from '../types';
import {
  Star, Heart, CheckCircle, Globe, Phone, Mail, MapPin, Clock,
  Shield, Zap, Target, Award, TrendingUp, TrendingDown, Minus,
  ShoppingCart, Package, Wallet, Users, BarChart3, FileText,
  Facebook, Instagram, Twitter, Linkedin, Youtube,
} from 'lucide-react';

const iconMap: Record<string, React.FC<any>> = {
  star: Star, heart: Heart, check: CheckCircle, globe: Globe,
  phone: Phone, mail: Mail, 'map-pin': MapPin, clock: Clock,
  shield: Shield, zap: Zap, target: Target, award: Award,
};

const shadowMap: Record<string, string> = {
  none: 'none', sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px -1px rgba(0,0,0,0.1)', lg: '0 10px 15px -3px rgba(0,0,0,0.1)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.1)',
};

const gradientMap: Record<string, string> = {
  blue: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  purple: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  green: 'linear-gradient(135deg, #10b981, #059669)',
  orange: 'linear-gradient(135deg, #f59e0b, #d97706)',
  pink: 'linear-gradient(135deg, #ec4899, #db2777)',
};

interface WidgetRendererProps {
  widget: WidgetInstance;
  isPreview?: boolean;
}

export default function WidgetRenderer({ widget, isPreview }: WidgetRendererProps) {
  const p = widget.properties;

  switch (widget.type) {
    // ===== LAYOUT =====
    case 'container':
      return (
        <div style={{
          width: '100%', height: '100%',
          backgroundColor: p.backgroundColor,
          borderRadius: p.borderRadius,
          border: p.borderWidth > 0 ? `${p.borderWidth}px solid ${p.borderColor}` : 'none',
          padding: p.padding,
          boxShadow: shadowMap[p.shadow] || 'none',
        }}>
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            Kontainer
          </div>
        </div>
      );

    case 'columns':
      return (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${p.columnCount}, 1fr)`,
          gap: p.gap,
          width: '100%', height: '100%',
          backgroundColor: p.backgroundColor !== 'transparent' ? p.backgroundColor : undefined,
          padding: 8,
        }}>
          {Array.from({ length: Number(p.columnCount) }).map((_, i) => (
            <div key={i} className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
              Kolom {i + 1}
            </div>
          ))}
        </div>
      );

    case 'divider':
      return (
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', padding: `${p.marginY}px 0` }}>
          <hr style={{
            width: '100%', border: 'none',
            borderTop: `${p.thickness}px ${p.style} ${p.color}`,
          }} />
        </div>
      );

    case 'spacer':
      return <div style={{ width: '100%', height: p.height, background: 'transparent' }} />;

    // ===== TEXT =====
    case 'heading': {
      const Tag = p.level as keyof JSX.IntrinsicElements;
      const sizes: Record<string, string> = {
        h1: '2.25rem', h2: '1.875rem', h3: '1.5rem', h4: '1.25rem', h5: '1.125rem', h6: '1rem',
      };
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
          <Tag style={{
            fontSize: sizes[p.level], fontWeight: p.fontWeight,
            color: p.color, textAlign: p.alignment, width: '100%',
            margin: 0, lineHeight: 1.2,
          }}>
            {p.text}
          </Tag>
        </div>
      );
    }

    case 'paragraph':
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', padding: 4 }}>
          <p style={{
            fontSize: p.fontSize, color: p.color,
            lineHeight: p.lineHeight, textAlign: p.alignment,
            margin: 0,
          }}>
            {p.text}
          </p>
        </div>
      );

    case 'richtext':
      return (
        <div style={{ width: '100%', height: '100%', padding: p.padding, overflow: 'auto' }}
          dangerouslySetInnerHTML={{ __html: p.content }}
        />
      );

    case 'quote':
      return (
        <div style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center',
          backgroundColor: p.backgroundColor, borderLeft: `4px solid ${p.accentColor}`,
          padding: '16px 24px', borderRadius: 8,
        }}>
          <div>
            <p style={{ fontStyle: 'italic', fontSize: 16, color: '#374151', margin: 0, marginBottom: 8, lineHeight: 1.6 }}>
              &ldquo;{p.text}&rdquo;
            </p>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0, fontWeight: 500 }}>{p.author}</p>
          </div>
        </div>
      );

    case 'code':
      return (
        <div style={{
          width: '100%', height: '100%', overflow: 'auto',
          backgroundColor: p.theme === 'dark' ? '#1e1e1e' : '#f8f9fa',
          color: p.theme === 'dark' ? '#d4d4d4' : '#333',
          borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 13,
          whiteSpace: 'pre-wrap', lineHeight: 1.5,
        }}>
          {p.code}
        </div>
      );

    // ===== MEDIA =====
    case 'image':
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: p.borderRadius, boxShadow: shadowMap[p.shadow] || 'none' }}>
          <img src={p.src} alt={p.alt} style={{ width: '100%', height: '100%', objectFit: p.objectFit }} />
        </div>
      );

    case 'video':
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: p.borderRadius }}>
          <iframe src={p.url} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
        </div>
      );

    case 'gallery': {
      const images = (p.images || '').split('\n').filter(Boolean);
      return (
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${p.columns}, 1fr)`,
          gap: p.gap, width: '100%', height: '100%', overflow: 'hidden',
        }}>
          {images.map((src: string, i: number) => (
            <div key={i} style={{ overflow: 'hidden', borderRadius: p.borderRadius }}>
              <img src={src.trim()} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ))}
        </div>
      );
    }

    case 'icon': {
      const IconComponent = iconMap[p.iconName] || Star;
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconComponent size={p.size} color={p.color} />
        </div>
      );
    }

    // ===== NAVIGATION =====
    case 'navbar':
      return (
        <div style={{
          width: '100%', height: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 24px',
          backgroundColor: p.backgroundColor, color: p.textColor,
          borderBottom: '1px solid #e5e7eb',
        }}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>{p.brandName}</span>
          <div style={{ display: 'flex', gap: 24 }}>
            {(p.links || '').split(',').map((link: string, i: number) => (
              <span key={i} style={{ fontSize: 14, cursor: 'pointer', opacity: 0.8 }}>{link.trim()}</span>
            ))}
          </div>
        </div>
      );

    case 'breadcrumb':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#6b7280' }}>
          {(p.items || '').split(',').map((item: string, i: number, arr: string[]) => (
            <React.Fragment key={i}>
              <span style={{ color: i === arr.length - 1 ? '#111827' : '#6b7280', fontWeight: i === arr.length - 1 ? 600 : 400, cursor: 'pointer' }}>
                {item.trim()}
              </span>
              {i < arr.length - 1 && <span style={{ color: '#d1d5db' }}>{p.separator}</span>}
            </React.Fragment>
          ))}
        </div>
      );

    case 'footer':
      return (
        <div style={{
          width: '100%', height: '100%', backgroundColor: p.backgroundColor,
          color: p.textColor, padding: 24, borderRadius: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{p.companyName}</div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>{p.description}</div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {(p.links || '').split(',').map((link: string, i: number) => (
                <span key={i} style={{ fontSize: 13, opacity: 0.8, cursor: 'pointer' }}>{link.trim()}</span>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, fontSize: 12, opacity: 0.6 }}>
            {p.copyright}
          </div>
        </div>
      );

    // ===== FORMS =====
    case 'button': {
      const btnSizes: Record<string, any> = {
        sm: { padding: '6px 16px', fontSize: 13 },
        md: { padding: '10px 24px', fontSize: 14 },
        lg: { padding: '14px 32px', fontSize: 16 },
        xl: { padding: '18px 40px', fontSize: 18 },
      };
      const variants: Record<string, any> = {
        primary: { backgroundColor: p.backgroundColor, color: '#fff', border: 'none' },
        secondary: { backgroundColor: '#f3f4f6', color: '#374151', border: 'none' },
        outline: { backgroundColor: 'transparent', color: p.backgroundColor, border: `2px solid ${p.backgroundColor}` },
        ghost: { backgroundColor: 'transparent', color: p.backgroundColor, border: 'none' },
      };
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button style={{
            ...btnSizes[p.size], ...variants[p.variant],
            borderRadius: p.borderRadius, fontWeight: 600,
            cursor: 'pointer', width: p.fullWidth ? '100%' : 'auto',
            transition: 'all 0.2s',
          }}>
            {p.text}
          </button>
        </div>
      );
    }

    case 'input':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 4 }}>
          <label style={{ fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>{p.label}</label>
          <input type={p.type} placeholder={p.placeholder} readOnly
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, backgroundColor: '#fff' }}
          />
        </div>
      );

    case 'contactForm':
      return (
        <div style={{
          width: '100%', height: '100%', backgroundColor: p.backgroundColor,
          borderRadius: 12, padding: 24, overflow: 'auto',
        }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: '#111827' }}>{p.title}</h3>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>{p.description}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input placeholder="Nama Lengkap" readOnly style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }} />
            <input placeholder="Email" readOnly style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }} />
            <textarea placeholder="Pesan..." readOnly rows={3} style={{ padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, resize: 'none' }} />
            <button style={{
              padding: '10px 24px', backgroundColor: p.accentColor, color: '#fff',
              border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer',
            }}>{p.submitText}</button>
          </div>
        </div>
      );

    case 'search':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: 4 }}>
          <input placeholder={p.placeholder} readOnly style={{
            flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14,
          }} />
          <button style={{
            padding: '10px 20px', backgroundColor: p.accentColor, color: '#fff',
            border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>{p.buttonText}</button>
        </div>
      );

    // ===== DATA =====
    case 'table': {
      const headers = (p.headers || '').split(',').map((h: string) => h.trim());
      let rows: string[][] = [];
      try { rows = JSON.parse(p.rows); } catch {}
      return (
        <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {headers.map((h: string, i: number) => (
                  <th key={i} style={{
                    padding: '10px 12px', textAlign: 'left', fontWeight: 600,
                    backgroundColor: p.headerColor, borderBottom: '2px solid #e5e7eb',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ backgroundColor: p.striped && ri % 2 === 1 ? '#f9fafb' : '#fff' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{
                      padding: '8px 12px',
                      borderBottom: p.bordered ? '1px solid #e5e7eb' : 'none',
                    }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'statsCard': {
      const changeColors: Record<string, string> = { positive: '#10b981', negative: '#ef4444', neutral: '#6b7280' };
      const ChangeIcon = p.changeType === 'positive' ? TrendingUp : p.changeType === 'negative' ? TrendingDown : Minus;
      return (
        <div style={{
          width: '100%', height: '100%', backgroundColor: p.backgroundColor,
          borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>{p.label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{p.value}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: changeColors[p.changeType] }}>
            <ChangeIcon size={16} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{p.change}</span>
          </div>
        </div>
      );
    }

    case 'list': {
      const items = (p.items || '').split('\n').filter(Boolean);
      const markers: Record<string, (i: number) => React.ReactNode> = {
        check: () => <CheckCircle size={16} color={p.color} style={{ flexShrink: 0 }} />,
        bullet: () => <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: p.color, flexShrink: 0 }} />,
        number: (i: number) => <span style={{ fontWeight: 600, color: p.color, fontSize: 14, minWidth: 20, flexShrink: 0 }}>{i + 1}.</span>,
        arrow: () => <span style={{ color: p.color, fontWeight: 700, flexShrink: 0 }}>→</span>,
      };
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 8, overflow: 'auto' }}>
          {items.map((item: string, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#374151' }}>
              {markers[p.listType]?.(i)}
              <span>{item.trim()}</span>
            </div>
          ))}
        </div>
      );
    }

    case 'cards': {
      let cards: any[] = [];
      try { cards = JSON.parse(p.cards); } catch {}
      return (
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${p.columns}, 1fr)`,
          gap: 16, width: '100%', height: '100%', padding: 8,
        }}>
          {cards.map((card, i) => {
            const CardIcon = iconMap[card.icon] || Star;
            return (
              <div key={i} style={{
                backgroundColor: '#fff', border: '1px solid #e5e7eb',
                borderRadius: 12, padding: 20, textAlign: 'center',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${p.accentColor}15`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                }}>
                  <CardIcon size={24} color={p.accentColor} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{card.title}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{card.desc}</div>
              </div>
            );
          })}
        </div>
      );
    }

    // ===== COMMERCE =====
    case 'priceCard':
      return (
        <div style={{
          width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden',
          border: p.featured ? `2px solid ${p.accentColor}` : '1px solid #e5e7eb',
          backgroundColor: '#fff', display: 'flex', flexDirection: 'column',
        }}>
          {p.featured && (
            <div style={{ backgroundColor: p.accentColor, color: '#fff', textAlign: 'center', padding: '6px 0', fontSize: 12, fontWeight: 600 }}>
              PALING POPULER
            </div>
          )}
          <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{p.planName}</div>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 32, fontWeight: 800 }}>{p.price}</span>
              <span style={{ fontSize: 14, color: '#6b7280' }}>{p.period}</span>
            </div>
            <div style={{ flex: 1, marginBottom: 16 }}>
              {(p.features || '').split('\n').filter(Boolean).map((f: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, marginBottom: 8 }}>
                  <CheckCircle size={16} color={p.accentColor} />
                  <span>{f.trim()}</span>
                </div>
              ))}
            </div>
            <button style={{
              width: '100%', padding: '12px 0', backgroundColor: p.featured ? p.accentColor : '#f3f4f6',
              color: p.featured ? '#fff' : '#374151', border: 'none', borderRadius: 8,
              fontWeight: 600, cursor: 'pointer', fontSize: 14,
            }}>{p.buttonText}</button>
          </div>
        </div>
      );

    case 'cta':
      return (
        <div style={{
          width: '100%', height: '100%', borderRadius: 16,
          background: gradientMap[p.backgroundGradient] || gradientMap.blue,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 32, textAlign: 'center', color: '#fff',
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, margin: '0 0 8px 0' }}>{p.title}</h2>
          <p style={{ fontSize: 16, opacity: 0.9, marginBottom: 20, margin: '0 0 20px 0' }}>{p.description}</p>
          <button style={{
            padding: '12px 32px', backgroundColor: '#fff', color: '#111827',
            border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 15,
          }}>{p.buttonText}</button>
        </div>
      );

    case 'productCard':
      return (
        <div style={{
          width: '100%', height: '100%', borderRadius: 12,
          border: '1px solid #e5e7eb', backgroundColor: '#fff', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ position: 'relative', height: '55%', overflow: 'hidden' }}>
            <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {p.badge && (
              <span style={{
                position: 'absolute', top: 8, left: 8, backgroundColor: '#ef4444',
                color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6,
              }}>{p.badge}</span>
            )}
          </div>
          <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill={i < Math.floor(p.rating) ? '#f59e0b' : 'none'} color="#f59e0b" />
                ))}
                <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>{p.rating}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{p.price}</span>
              {p.originalPrice && (
                <span style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'line-through' }}>{p.originalPrice}</span>
              )}
            </div>
          </div>
        </div>
      );

    // ===== SOCIAL =====
    case 'testimonial': {
      const stars = Array.from({ length: 5 });
      return (
        <div style={{
          width: '100%', height: '100%', backgroundColor: '#fff',
          borderRadius: 12, border: '1px solid #e5e7eb', padding: 20,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
              {stars.map((_, i) => <Star key={i} size={16} fill={i < p.rating ? '#f59e0b' : 'none'} color="#f59e0b" />)}
            </div>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>
              &ldquo;{p.text}&rdquo;
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {p.avatar ? <img src={p.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                <Users size={20} color="#9ca3af" />}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.author}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{p.role}</div>
            </div>
          </div>
        </div>
      );
    }

    case 'team':
      return (
        <div style={{
          width: '100%', height: '100%', backgroundColor: '#fff',
          borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden',
          textAlign: 'center',
        }}>
          <div style={{
            width: '100%', height: '50%',
            background: `linear-gradient(135deg, ${p.accentColor}20, ${p.accentColor}40)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {p.avatar ? (
              <img src={p.avatar} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #fff' }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: p.accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={36} color="#fff" />
              </div>
            )}
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{p.name}</div>
            <div style={{ fontSize: 13, color: p.accentColor, fontWeight: 500, marginBottom: 8 }}>{p.role}</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{p.bio}</div>
          </div>
        </div>
      );

    case 'socialLinks': {
      const socials = [
        { key: 'facebook', icon: '𝕗', color: '#1877f2' },
        { key: 'instagram', icon: '📷', color: '#e4405f' },
        { key: 'twitter', icon: '𝕏', color: '#000' },
        { key: 'linkedin', icon: 'in', color: '#0077b5' },
        { key: 'youtube', icon: '▶', color: '#ff0000' },
      ];
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          {socials.filter(s => p[s.key]).map(s => (
            <div key={s.key} style={{
              width: p.size, height: p.size, borderRadius: '50%',
              backgroundColor: `${p.color}15`, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: p.size * 0.45, fontWeight: 700,
              color: p.color, transition: 'all 0.2s',
            }}>
              {s.icon}
            </div>
          ))}
        </div>
      );
    }

    // ===== CHARTS =====
    case 'barChart': {
      const labels = (p.labels || '').split(',');
      const values = (p.values || '').split(',').map(Number);
      const maxVal = Math.max(...values, 1);
      return (
        <div style={{ width: '100%', height: '100%', padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>{p.title}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 'calc(100% - 60px)' }}>
            {labels.map((label: string, i: number) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{values[i]}</div>
                <div style={{
                  width: '100%', height: `${(values[i] / maxVal) * 100}%`,
                  backgroundColor: p.color, borderRadius: '4px 4px 0 0',
                  minHeight: 4, transition: 'height 0.3s',
                }} />
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, textAlign: 'center' }}>{label.trim()}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'lineChart': {
      const labels = (p.labels || '').split(',');
      const values = (p.values || '').split(',').map(Number);
      const maxVal = Math.max(...values, 1);
      const minVal = Math.min(...values);
      const range = maxVal - minVal || 1;
      const w = 100;
      const h = 60;
      const points = values.map((v: number, i: number) => ({
        x: (i / (values.length - 1)) * w,
        y: h - ((v - minVal) / range) * h,
      }));
      const line = points.map((pt: any) => `${pt.x},${pt.y}`).join(' ');
      const area = `0,${h} ${line} ${w},${h}`;
      return (
        <div style={{ width: '100%', height: '100%', padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>{p.title}</div>
          <svg viewBox={`-2 -5 ${w + 4} ${h + 20}`} style={{ width: '100%', height: 'calc(100% - 40px)' }}>
            {p.fill && <polygon points={area} fill={`${p.color}20`} />}
            <polyline points={line} fill="none" stroke={p.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((pt: any, i: number) => (
              <circle key={i} cx={pt.x} cy={pt.y} r="3" fill={p.color} />
            ))}
            {labels.map((label: string, i: number) => (
              <text key={i} x={points[i]?.x} y={h + 14} textAnchor="middle" fontSize="5" fill="#6b7280">{label.trim()}</text>
            ))}
          </svg>
        </div>
      );
    }

    case 'pieChart': {
      const labels = (p.labels || '').split(',');
      const values = (p.values || '').split(',').map(Number);
      const colors = (p.colors || '').split(',');
      const total = values.reduce((a: number, b: number) => a + b, 0) || 1;
      let cumAngle = 0;
      const slices = values.map((v: number, i: number) => {
        const angle = (v / total) * 360;
        const startAngle = cumAngle;
        cumAngle += angle;
        return { value: v, angle, startAngle, color: colors[i]?.trim() || '#ccc', label: labels[i]?.trim() || '' };
      });
      const cx = 50, cy = 50, r = 40;
      return (
        <div style={{ width: '100%', height: '100%', padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{p.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, height: 'calc(100% - 40px)' }}>
            <svg viewBox="0 0 100 100" style={{ width: '60%', height: '100%' }}>
              {slices.map((s: { startAngle: number; angle: number; color: string; value: number; label: string }, i: number) => {
                const startRad = (s.startAngle - 90) * Math.PI / 180;
                const endRad = (s.startAngle + s.angle - 90) * Math.PI / 180;
                const largeArc = s.angle > 180 ? 1 : 0;
                const x1 = cx + r * Math.cos(startRad);
                const y1 = cy + r * Math.sin(startRad);
                const x2 = cx + r * Math.cos(endRad);
                const y2 = cy + r * Math.sin(endRad);
                return (
                  <path key={i}
                    d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={s.color} stroke="#fff" strokeWidth="1"
                  />
                );
              })}
            </svg>
            <div style={{ fontSize: 11 }}>
              {slices.map((s: { startAngle: number; angle: number; color: string; value: number; label: string }, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: s.color, flexShrink: 0 }} />
                  <span style={{ color: '#374151' }}>{s.label} ({Math.round((s.value / total) * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ===== MODULE WIDGETS =====
    case 'posWidget':
      return (
        <div style={{ width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${p.accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={20} color={p.accentColor} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{p.title}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ backgroundColor: '#f0fdf4', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Hari ini</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>Rp 8.5M</div>
            </div>
            <div style={{ backgroundColor: '#eff6ff', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Transaksi</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>142</div>
            </div>
          </div>
        </div>
      );

    case 'inventoryWidget':
      return (
        <div style={{ width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${p.accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={20} color={p.accentColor} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{p.title}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[{ label: 'Stok Tersedia', val: '1,234', c: '#10b981' }, { label: 'Stok Rendah', val: '23', c: '#f59e0b' }, { label: 'Habis', val: '5', c: '#ef4444' }].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                <span style={{ color: '#6b7280' }}>{item.label}</span>
                <span style={{ fontWeight: 600, color: item.c }}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'financeWidget':
      return (
        <div style={{ width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${p.accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={20} color={p.accentColor} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{p.title}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ backgroundColor: '#faf5ff', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Pendapatan</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>Rp 125M</div>
            </div>
            <div style={{ backgroundColor: '#fff7ed', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Pengeluaran</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>Rp 89M</div>
            </div>
          </div>
        </div>
      );

    case 'hrisWidget':
      return (
        <div style={{ width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${p.accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} color={p.accentColor} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{p.title}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[{ label: 'Total Karyawan', val: '156' }, { label: 'Hadir Hari Ini', val: '142' }, { label: 'Cuti/Izin', val: '14' }].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                <span style={{ color: '#6b7280' }}>{item.label}</span>
                <span style={{ fontWeight: 600 }}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'reportsWidget':
      return (
        <div style={{ width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${p.accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={20} color={p.accentColor} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{p.title}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Laporan Harian - Selesai', 'Laporan Mingguan - Proses', 'Laporan Bulanan - Pending'].map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 13, padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: 6,
              }}>
                <span>{item.split(' - ')[0]}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                  backgroundColor: i === 0 ? '#dcfce7' : i === 1 ? '#fef3c7' : '#e5e7eb',
                  color: i === 0 ? '#16a34a' : i === 1 ? '#d97706' : '#6b7280',
                }}>{item.split(' - ')[1]}</span>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div style={{
          width: '100%', height: '100%', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#f3f4f6', borderRadius: 8,
          color: '#9ca3af', fontSize: 14,
        }}>
          Widget: {widget.type}
        </div>
      );
  }
}

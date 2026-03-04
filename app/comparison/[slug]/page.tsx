import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { comparisons } from '@/lib/comparisons';
import JsonLd from '@/components/marketing/JsonLd';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import TradiaLogo from '@/components/TradiaLogo';
import { Check, X, Shield, Brain, Zap, Clock } from 'lucide-react';
import Link from 'next/link';

interface Props {
    params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const data = comparisons[params.slug];
    if (!data) return { title: 'Not Found' };

    return {
        title: data.title,
        description: data.description,
        openGraph: {
            title: data.title,
            description: data.description,
            type: 'website',
        },
    };
}

export async function generateStaticParams() {
    return Object.keys(comparisons).map((slug) => ({
        slug,
    }));
}

export default function ComparisonPage({ params }: Props) {
    const data = comparisons[params.slug];

    if (!data) {
        notFound();
    }

    const softwareSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Tradia AI",
        "applicationCategory": "FinTech / Trading Journal",
        "operatingSystem": "Web, Mobile",
        "description": data.description,
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "1250"
        }
    };

    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": data.faq.map(item => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer
            }
        }))
    };

    return (
        /* Force dark mode locally for the comparison page */
        <div className="dark bg-[#0a0d11] text-white min-h-screen transition-colors duration-500">
            <JsonLd data={softwareSchema} />
            <JsonLd data={faqSchema} />

            <div className="bg-[#0a0d11]">
                <Navbar className="!bg-[#0a0d11] !border-white/10" />
            </div>

            <main className="bg-[#0a0d11]">
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 px-6 overflow-hidden bg-[#0a0d11]">
                    {/* Deep Brand Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[700px] bg-gradient-to-b from-blue-600/10 via-[#0a0d11]/50 to-transparent pointer-events-none" />

                    <div className="max-w-7xl mx-auto text-center relative z-10">
                        <div className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-blue-500/10 border border-blue-500/30 mb-10">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            <span className="text-sm font-black tracking-[0.2em] text-blue-400 uppercase">2026 Comparison Edition</span>
                        </div>

                        <h1 className="text-6xl md:text-9xl font-black mb-10 leading-none tracking-tighter text-white drop-shadow-2xl">
                            {data.heroHeadline.split('vs').map((part, i) => (
                                <span key={i} className="inline-block">
                                    {i > 0 && <span className="text-blue-500 mx-4 opacity-80 italic">vs</span>}
                                    {part}
                                </span>
                            ))}
                        </h1>

                        <p className="text-xl md:text-2xl text-gray-400 mb-14 max-w-4xl mx-auto leading-relaxed font-semibold">
                            {data.heroSubheadline}
                        </p>

                        <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
                            <Link href="/signup" className="w-full sm:w-auto px-14 py-6 rounded-2xl bg-blue-600 text-white hover:bg-blue-500 font-black text-xl transition-all shadow-[0_20px_50px_-15px_rgba(59,130,246,0.5)] transform hover:-translate-y-1 active:scale-95 leading-none">
                                Start Free Trial Now
                            </Link>
                            <Link href="/pricing" className="w-full sm:w-auto px-14 py-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/20 text-white font-black text-xl transition-all backdrop-blur-md leading-none">
                                View Pricing
                            </Link>
                        </div>
                    </div>
                </section>

                {/* The Pain vs Solution Section */}
                <section className="py-28 px-6 relative bg-[#0a0d11]">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-10">
                            {/* Pain Points */}
                            <div className="p-10 lg:p-14 rounded-[3rem] bg-[#0f1319] border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
                                <div className="absolute top-0 right-0 p-10 text-white opacity-[0.03] transform translate-x-6 -translate-y-6">
                                    <X size={150} />
                                </div>
                                <h3 className="text-3xl font-black mb-10 text-gray-500">The Problem with {data.competitorName}</h3>
                                <ul className="space-y-8">
                                    {data.painPoints.map((point, i) => (
                                        <li key={i} className="flex items-start space-x-5">
                                            <div className="mt-1.5 p-1.5 rounded-lg bg-red-500/10 text-red-500 shrink-0">
                                                <X size={20} />
                                            </div>
                                            <span className="text-xl text-gray-400 font-medium leading-snug">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Advantages */}
                            <div className="p-10 lg:p-14 rounded-[3rem] bg-blue-600/[0.04] border border-blue-500/20 relative overflow-hidden group shadow-[0_0_80px_-20px_rgba(59,130,246,0.15)] hover:border-blue-500/40 transition-all">
                                <div className="absolute top-0 right-0 p-10 text-blue-500 opacity-10 transform translate-x-6 -translate-y-6">
                                    <Check size={150} />
                                </div>
                                <h3 className="text-3xl font-black mb-10 text-blue-400">The Tradia Edge</h3>
                                <ul className="space-y-8">
                                    {data.tradiaAdvantages.map((point, i) => (
                                        <li key={i} className="flex items-start space-x-5">
                                            <div className="mt-1.5 p-1.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0 shadow-[0_0_10px_rgba(96,165,250,0.3)]">
                                                <Check size={20} />
                                            </div>
                                            <span className="text-xl text-white font-black leading-snug drop-shadow-sm">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature Matrix */}
                <section className="py-28 px-6 bg-[#07090c]">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-5xl font-black mb-20 text-center text-white">Deep Feature Comparison</h2>
                        <div className="overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0a0d11] shadow-3xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-black/40">
                                            <th className="p-10 text-xs font-black uppercase tracking-[0.3em] text-gray-500">Infrastructure</th>
                                            <th className="p-10 text-xs font-black uppercase tracking-[0.3em] text-gray-500">{data.competitorName}</th>
                                            <th className="p-10 text-xs font-black uppercase tracking-[0.3em] text-blue-400">Tradia AI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.03]">
                                        {data.features.map((feature, i) => (
                                            <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="p-10 font-bold text-xl text-white">{feature.name}</td>
                                                <td className="p-10 text-gray-500 font-medium">{feature.competitorValue}</td>
                                                <td className="p-10">
                                                    <div className={`inline-flex items-center space-x-3 ${feature.isTradiaBetter ? 'text-blue-400 font-black scale-105 transform origin-left' : 'text-gray-300 font-bold'}`}>
                                                        {feature.isTradiaBetter && <Check size={22} className="shrink-0 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />}
                                                        <span className="text-lg">{feature.tradiaValue}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="py-28 px-6 bg-[#0a0d11]">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-5xl font-black mb-20 text-center text-white">Inside the Engine</h2>
                        <div className="grid gap-6">
                            {data.faq.map((item, i) => (
                                <div key={i} className="p-10 rounded-[2rem] bg-[#0f1319] border border-white/5 hover:border-white/10 transition-all shadow-inner">
                                    <h4 className="text-2xl font-black mb-5 text-white">{item.question}</h4>
                                    <p className="text-xl text-gray-400 leading-relaxed font-medium">{item.answer}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-40 px-6 relative overflow-hidden bg-black border-t border-white/10">
                    <div className="absolute inset-0 bg-blue-600/5" />
                    <div className="max-w-6xl mx-auto text-center relative z-10">
                        <h2 className="text-6xl md:text-8xl font-black mb-10 text-white leading-none tracking-tighter">Ready to dominate?</h2>
                        <p className="text-2xl text-gray-400 mb-16 font-bold max-w-2xl mx-auto">
                            Stop hemorrhaging capital. Join the elite top 1% who leverage AI to secure their funding.
                        </p>
                        <Link href="/signup" className="inline-block px-20 py-8 rounded-3xl bg-blue-600 text-white font-black text-3xl transition-all shadow-[0_30px_60px_-15px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95">
                            Secure Your Edge Now
                        </Link>
                        <p className="mt-12 text-sm font-black text-white/30 uppercase tracking-[0.5em]">No credit card required. Pure performance.</p>
                    </div>
                </section>
            </main>

            <div className="bg-[#0a0d11]">
                <Footer />
            </div>
        </div>
    );
}

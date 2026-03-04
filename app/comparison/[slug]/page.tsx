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
        <div className="min-h-screen bg-[#050505] text-white">
            <JsonLd data={softwareSchema} />
            <JsonLd data={faqSchema} />

            <Navbar />

            <main>
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
                    <div className="max-w-7xl mx-auto text-center relative z-10">
                        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-sm font-bold tracking-wider text-blue-400 uppercase">2026 Comparison Edition</span>
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black mb-8 leading-tight tracking-tight">
                            {data.heroHeadline.split('vs').map((part, i) => (
                                <span key={i}>
                                    {i > 0 && <span className="text-blue-500"> vs </span>}
                                    {part}
                                </span>
                            ))}
                        </h1>
                        <p className="text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
                            {data.heroSubheadline}
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
                            <Link href="/signup" className="w-full sm:w-auto px-12 py-5 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-lg transition-all shadow-2xl shadow-blue-500/20 transform hover:-translate-y-1">
                                Start Free Trial
                            </Link>
                            <Link href="/pricing" className="w-full sm:w-auto px-12 py-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold text-lg transition-all">
                                View Pricing
                            </Link>
                        </div>
                    </div>
                </section>

                {/* The Pain vs Solution Section */}
                <section className="py-24 px-6 relative">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
                            {/* Pain Points */}
                            <div className="p-8 lg:p-12 rounded-[2.5rem] bg-slate-900/40 border border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 text-slate-800 opacity-20 transform translate-x-4 -translate-y-4">
                                    <X size={120} />
                                </div>
                                <h3 className="text-2xl font-bold mb-8 text-slate-400">The Problem with {data.competitorName}</h3>
                                <ul className="space-y-6">
                                    {data.painPoints.map((point, i) => (
                                        <li key={i} className="flex items-start space-x-4">
                                            <div className="mt-1 p-1 rounded-md bg-red-500/10 text-red-500">
                                                <X size={18} />
                                            </div>
                                            <span className="text-lg text-slate-300">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Advantages */}
                            <div className="p-8 lg:p-12 rounded-[2.5rem] bg-blue-600/5 border border-blue-500/20 relative overflow-hidden group shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)]">
                                <div className="absolute top-0 right-0 p-8 text-blue-500 opacity-10 transform translate-x-4 -translate-y-4">
                                    <Check size={120} />
                                </div>
                                <h3 className="text-2xl font-bold mb-8 text-blue-400">The Tradia Edge</h3>
                                <ul className="space-y-6">
                                    {data.tradiaAdvantages.map((point, i) => (
                                        <li key={i} className="flex items-start space-x-4">
                                            <div className="mt-1 p-1 rounded-md bg-blue-500/10 text-blue-500">
                                                <Check size={18} />
                                            </div>
                                            <span className="text-lg text-slate-100 font-medium">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature Matrix */}
                <section className="py-24 px-6 bg-slate-950/50">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-4xl font-bold mb-16 text-center">Feature Breakdown</h2>
                        <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-slate-900/20">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/5">
                                            <th className="p-8 text-sm font-bold uppercase tracking-wider text-slate-500">Feature</th>
                                            <th className="p-8 text-sm font-bold uppercase tracking-wider text-slate-500">{data.competitorName}</th>
                                            <th className="p-8 text-sm font-bold uppercase tracking-wider text-blue-400">Tradia AI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data.features.map((feature, i) => (
                                            <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="p-8 font-semibold text-lg">{feature.name}</td>
                                                <td className="p-8 text-slate-400">{feature.competitorValue}</td>
                                                <td className="p-8">
                                                    <div className={`inline-flex items-center space-x-2 ${feature.isTradiaBetter ? 'text-blue-400 font-bold' : 'text-slate-100'}`}>
                                                        {feature.isTradiaBetter && <Check size={18} className="shrink-0" />}
                                                        <span>{feature.tradiaValue}</span>
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
                <section className="py-24 px-6">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-4xl font-bold mb-16 text-center">Frequently Asked Questions</h2>
                        <div className="space-y-8">
                            {data.faq.map((item, i) => (
                                <div key={i} className="p-8 rounded-3xl bg-slate-900/40 border border-white/5">
                                    <h4 className="text-xl font-bold mb-4">{item.question}</h4>
                                    <p className="text-lg text-slate-400 leading-relaxed">{item.answer}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-32 px-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-600" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-50" />
                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <h2 className="text-5xl md:text-7xl font-black mb-8">Ready to evolve your trading?</h2>
                        <p className="text-xl text-white/80 mb-12">
                            Join thousands of prop firm traders who switched to Tradia AI and unlocked their behavioral edge.
                        </p>
                        <Link href="/signup" className="inline-block px-16 py-6 rounded-2xl bg-white text-blue-600 font-black text-2xl transition-all shadow-2xl hover:scale-105 active:scale-95">
                            Get Started for Free
                        </Link>
                        <p className="mt-8 text-sm font-medium text-white/60">No credit card required. Cancel anytime.</p>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}

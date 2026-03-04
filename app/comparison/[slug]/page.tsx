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
        <div className="min-h-screen bg-white dark:bg-[#0f1319] text-black dark:text-white transition-colors duration-300">
            <JsonLd data={softwareSchema} />
            <JsonLd data={faqSchema} />

            <Navbar />

            <main>
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                    {/* Subtle Brand Ambient Light */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none" />

                    <div className="max-w-7xl mx-auto text-center relative z-10">
                        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-sm font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase">2026 Comparison Edition</span>
                        </div>

                        <h1 className="text-5xl md:text-8xl font-black mb-8 leading-tight tracking-tight text-black dark:text-white">
                            {data.heroHeadline.split('vs').map((part, i) => (
                                <span key={i}>
                                    {i > 0 && <span className="text-blue-600 dark:text-blue-500"> vs </span>}
                                    {part}
                                </span>
                            ))}
                        </h1>

                        <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
                            {data.heroSubheadline}
                        </p>

                        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
                            <Link href="/signup" className="w-full sm:w-auto px-12 py-5 rounded-2xl bg-black dark:bg-white text-white dark:text-black hover:opacity-90 font-bold text-lg transition-all shadow-xl transform hover:-translate-y-1">
                                Start Free Trial
                            </Link>
                            <Link href="/pricing" className="w-full sm:w-auto px-12 py-5 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-black dark:text-white font-bold text-lg transition-all">
                                View Pricing
                            </Link>
                        </div>
                    </div>
                </section>

                {/* The Pain vs Solution Section */}
                <section className="py-24 px-6 relative">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                            {/* Pain Points */}
                            <div className="p-8 lg:p-12 rounded-[2.5rem] bg-gray-50 dark:bg-[#141920] border border-gray-200 dark:border-gray-800 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 text-gray-200 dark:text-white/5 transform translate-x-4 -translate-y-4">
                                    <X size={120} />
                                </div>
                                <h3 className="text-2xl font-bold mb-8 text-gray-700 dark:text-gray-300">The Problem with {data.competitorName}</h3>
                                <ul className="space-y-6">
                                    {data.painPoints.map((point, i) => (
                                        <li key={i} className="flex items-start space-x-4">
                                            <div className="mt-1 p-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-500">
                                                <X size={18} />
                                            </div>
                                            <span className="text-lg text-gray-600 dark:text-gray-300">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Advantages */}
                            <div className="p-8 lg:p-12 rounded-[2.5rem] bg-blue-500/5 dark:bg-blue-500/[0.03] border border-blue-200 dark:border-blue-500/20 relative overflow-hidden group shadow-sm dark:shadow-[0_0_50px_-12px_rgba(59,130,246,0.15)]">
                                <div className="absolute top-0 right-0 p-8 text-blue-500 dark:text-blue-500/10 transform translate-x-4 -translate-y-4">
                                    <Check size={120} />
                                </div>
                                <h3 className="text-2xl font-bold mb-8 text-blue-600 dark:text-blue-400">The Tradia Edge</h3>
                                <ul className="space-y-6">
                                    {data.tradiaAdvantages.map((point, i) => (
                                        <li key={i} className="flex items-start space-x-4">
                                            <div className="mt-1 p-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-500">
                                                <Check size={18} />
                                            </div>
                                            <span className="text-lg text-black dark:text-gray-100 font-bold">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature Matrix */}
                <section className="py-24 px-6 bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="max-w-5xl mx-auto">
                        <h2 className="text-4xl font-black mb-16 text-center text-black dark:text-white">Feature Breakdown</h2>
                        <div className="overflow-hidden rounded-[2rem] border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#141920]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20">
                                            <th className="p-8 text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-500">Feature</th>
                                            <th className="p-8 text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-500">{data.competitorName}</th>
                                            <th className="p-8 text-sm font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Tradia AI</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                        {data.features.map((feature, i) => (
                                            <tr key={i} className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                <td className="p-8 font-bold text-lg text-black dark:text-white">{feature.name}</td>
                                                <td className="p-8 text-gray-600 dark:text-gray-400">{feature.competitorValue}</td>
                                                <td className="p-8">
                                                    <div className={`inline-flex items-center space-x-2 ${feature.isTradiaBetter ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-black dark:text-white font-bold'}`}>
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
                        <h2 className="text-4xl font-black mb-16 text-center text-black dark:text-white">Frequently Asked Questions</h2>
                        <div className="space-y-6">
                            {data.faq.map((item, i) => (
                                <div key={i} className="p-8 rounded-3xl bg-gray-50 dark:bg-[#141920] border border-gray-200 dark:border-gray-800 transition-all hover:border-gray-300 dark:hover:border-gray-700">
                                    <h4 className="text-xl font-black mb-4 text-black dark:text-white">{item.question}</h4>
                                    <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">{item.answer}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="py-32 px-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-black dark:bg-white" />
                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <h2 className="text-5xl md:text-7xl font-black mb-8 text-white dark:text-black">Ready to evolve your trading?</h2>
                        <p className="text-xl text-white/80 dark:text-black/80 mb-12 font-bold">
                            Join thousands of prop firm traders who switched to Tradia AI and unlocked their behavioral edge.
                        </p>
                        <Link href="/signup" className="inline-block px-16 py-6 rounded-2xl bg-white dark:bg-black text-black dark:text-white font-black text-2xl transition-all shadow-2xl hover:scale-105 active:scale-95">
                            Get Started for Free
                        </Link>
                        <p className="mt-8 text-sm font-bold text-white/60 dark:text-black/60 uppercase tracking-widest">No credit card required. Cancel anytime.</p>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}

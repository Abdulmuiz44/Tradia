export interface ComparisonFeature {
    name: string;
    competitorValue: string;
    tradiaValue: string;
    isTradiaBetter: boolean;
}

export interface ComparisonData {
    slug: string;
    competitorName: string;
    title: string;
    description: string;
    heroHeadline: string;
    heroSubheadline: string;
    painPoints: string[];
    tradiaAdvantages: string[];
    features: ComparisonFeature[];
    faq: {
        question: string;
        answer: string;
    }[];
}

import Head from 'next/head';

interface JsonLdProps {
    data: any;
}

export default function JsonLd({ data }: JsonLdProps) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}

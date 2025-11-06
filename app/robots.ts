import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://tradiaai.app';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/_next/', '/dashboard/'],
    },
    sitemap: `${site}/sitemap.xml`,
    host: site.replace(/^https?:\/\//, ''),
  };
}


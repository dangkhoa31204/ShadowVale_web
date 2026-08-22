import React from 'react';
import { PageHeader } from './components/PageHeader';
import { FilterBar } from './components/FilterBar';
import { FeaturedArticle } from './components/FeaturedArticle';
import { BlogCard } from './components/BlogCard';
import { Pagination } from './components/Pagination';

export const BlogsPage: React.FC = () => {
  const blogs = [
    {
      id: '1',
      tag: 'AI Development',
      logId: '8472-A',
      date: '2042.10.18',
      title: 'Enemy AI Development: Neural Networks in the Shadows',
      description: 'How we trained adversarial entities to predict player movement patterns in zero-visibility environments.',
      operator: 'M. CHEN',
      imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCqvC2eW9M3YBmG500ycx-2AgnTHuTaL5l3E0fPkQLfifcAuGm9Zfb4GZp5W-wCt5-sEB1jQ0xix0x5jn_BlVJbzjya6_Tto_7ZG9wXvSW-AeO2xJtjJWeo1JCg2fUfQYxQcYaxCD0_aCv0WLowtUPyijYQn5QmHDdOblC6ahw4g8Ag08HNXCfSCkV054uvH00zC0SlyflTS4K1nrOOWbdOHeeKppguXubxdptYZWjY74_tPM8uADbVvw'
    },
    {
      id: '2',
      tag: 'Game Design',
      logId: '9102-B',
      date: '2042.10.12',
      title: 'Data-Driven Game Design: The Core Engine',
      description: 'Analyzing telemetry to shape the core gameplay loop and ensure consistent tactical pacing.',
      operator: 'K. REESE',
      imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDuubhyD9iPxM4iHj0U5YpxqaYjs1Dqhui4jqd9FyTHZcI36ICPXfVyE3s_4oiJyQHtDjYf-fijjWmEKMcm-EKuMcSEAwkcXFgZ5A64gJpRcMbqDu1zy9U6E4a-dGuGZ0396te0JDq9oh4kgAGr5MnIZOjtLY-gcqlGzgiR13GnwnU4gY52towLVQCXvoXCvP-wZGrYI_FzDvTyjGNIGuCX5HO5_G9xU7wwEVucCiT43XciPf20Uml0JA'
    },
    {
      id: '3',
      tag: 'Balancing',
      logId: '7731-C',
      date: '2042.10.05',
      title: 'Balancing Player Difficulty: The Challenge Curve',
      description: 'Adjusting enemy response times and resource scarcity to maintain tension without causing frustration.',
      operator: 'T. STONE',
      imageSrc: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCBIkawlk_hMJBbSid4OfFyaU1ey11FUDkIlV_TjDhoC-G_OnzBB6Sj3Fgm2-wIR4MXYwg5a6uWjdPLRT8Gpna8GVcmxN8mgIHGIBwjV0JWD3vf2phR2Cbsant1edCWBNKlykXEYRUbY9LucJmSij-DxlT9Tx7i_po7xKZtDlvG3M1DXlaamW2SPJCeHhI0blug6-7LJ7ecpP8uwHaqI1d4XH8rLQgcREo96gzBK3weufkcIN1yOFcA3g'
    }
  ];

  return (
    <div className="max-w-container-max mx-auto space-y-stack-lg w-full py-8">
      <PageHeader />
      <FilterBar />
      <FeaturedArticle />
      
      {/* Section Divider */}
      <div className="flex items-center gap-4 py-4">
        <h3 className="font-label-caps text-label-caps text-on-surface-variant whitespace-nowrap">Standard Briefings</h3>
        <div className="h-px w-full bg-outline-variant opacity-50"></div>
      </div>
      
      {/* Blog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {blogs.map(blog => (
          <BlogCard key={blog.id} {...blog} />
        ))}
      </div>
      
      <Pagination />
    </div>
  );
};

export default BlogsPage;

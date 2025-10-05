'use client';

interface PageContentProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function PageContent({ children, title, description, className = '' }: PageContentProps) {
  return (
    <div className={`p-6 ${className}`}>
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 shadow-lg mt-8">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Copyright © {new Date().getFullYear()} Ahmet Toprak. Tüm hakları saklıdır.
        </p>
      </div>
    </footer>
  );
}
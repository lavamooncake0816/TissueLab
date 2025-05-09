import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';

export default function App({ Component, pageProps }: AppProps) {
  // State to check if the app is running in Electron
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if we're running in Electron
    setIsElectron(window.electron !== undefined);
  }, []);

  return (
    <>
      <Head>
        <title>WSI Viewer</title>
        <meta name="description" content="Whole Slide Image Viewer with Segmentation Visualization" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout>
        <Component {...pageProps} isElectron={isElectron} />
      </Layout>
    </>
  );
} 
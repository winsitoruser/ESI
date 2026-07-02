import type { GetServerSideProps } from 'next';

/**
 * /hq → server redirect to /hq/home (avoids client-only replace and empty SSR).
 */
export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/hq/home',
    permanent: false,
  },
});

export default function HQIndex() {
  return null;
}

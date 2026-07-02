import type { GetServerSideProps } from 'next';

/** Pendaftaran publik dinonaktifkan — gunakan halaman login. */
export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/auth/login', permanent: false },
});

export default function RegisterDisabled() {
  return null;
}

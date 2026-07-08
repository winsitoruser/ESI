import HQLayout from '@/components/hq/HQLayout';

type HumanifyLayoutProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  noPadding?: boolean;
};

/** Layout platform Humanify — HRIS System by Naincode */
export default function HumanifyLayout(props: HumanifyLayoutProps) {
  return <HQLayout {...props} platform="humanify" />;
}

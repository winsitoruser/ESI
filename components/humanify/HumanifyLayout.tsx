import HQLayout from '@/components/hq/HQLayout';
import HumanifyErrorBoundary from '@/components/humanify/HumanifyErrorBoundary';

type HumanifyLayoutProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  noPadding?: boolean;
};

/** Layout platform Humanify — HRIS System by Naincode */
export default function HumanifyLayout(props: HumanifyLayoutProps) {
  return (
    <HumanifyErrorBoundary>
      <HQLayout {...props} platform="humanify" />
    </HumanifyErrorBoundary>
  );
}

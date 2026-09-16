'use client';

import { AreaError } from '@/components/auth/area-error';

export default function BarError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <AreaError {...props} area="bar" />;
}

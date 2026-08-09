import Link from 'next/link';
import type { Metadata } from 'next';
import { getOrder } from '@/lib/queries';
import { OrderTracker } from '@/components/order/order-tracker';
import { Seal } from '@/components/brand';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Acompanhar pedido',
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) {
    return (
      <div className="mx-auto grid min-h-dvh max-w-md place-items-center px-4 text-center">
        <div>
          <Seal className="mx-auto h-14 w-14 text-cream/60" />
          <h1 className="mt-4 font-heading text-2xl uppercase tracking-wide">
            Pedido não encontrado
          </h1>
          <p className="mt-2 text-text-mid">
            Este pedido não existe ou foi removido.
          </p>
          <Link href="/" className="btn-primary mt-6">
            Voltar ao cardápio
          </Link>
        </div>
      </div>
    );
  }

  return <OrderTracker initial={order} />;
}

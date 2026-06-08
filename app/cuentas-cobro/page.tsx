import GenericModulePage from "@/components/GenericModulePage";

export default function Page() {
  return (
    <GenericModulePage
      title="Cuentas de cobro"
      subtitle="Cortes de cartera por cliente."
      table="collection_accounts"
    />
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { ItemsEditor } from "@/components/items-editor";
import { PageHeader } from "@/components/page-header";
import { Field } from "@/routes/_authenticated/clientes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/fmt";
import { canWriteCommercial, useMembership } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/orcamentos/$id")({
  head: () => ({
    meta: [
      { title: "Orçamento — Ki Delícia Gestão" },
      { name: "description", content: "Detalhe do orçamento com itens, totais e conversão em pedido." },
      { property: "og:title", content: "Orçamento — Ki Delícia Gestão" },
      { property: "og:description", content: "Itens, totais e conversão única em pedido." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrcamentoDetalhe;
});

function OrcamentoDetalhe() {
  return null;
}

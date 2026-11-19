import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import type { EstadoVinculo } from "./acoes";

// GET /rest/v1/vinculos_institucionais?event_id=in.(...)&select=event_id,
// estado,mapas_id,verificado_em (contrato do S0.2). Evento sem linha de
// retorno = sem vínculo.
export function useVinculos(
  supabase: SupabaseClient | null,
  ids: readonly number[],
): Record<number, EstadoVinculo> {
  const chave = [...ids].sort((a, b) => a - b).join(",");
  const [vinculos, setVinculos] = useState<Record<number, EstadoVinculo>>({});

  useEffect(() => {
    if (!supabase || ids.length === 0) {
      setVinculos({});
      return;
    }
    let cancelado = false;
    supabase
      .from("vinculos_institucionais")
      .select("event_id,estado,mapas_id,verificado_em")
      .in("event_id", [...ids])
      .then(({ data, error }) => {
        if (cancelado || error || !data) return;
        const mapa: Record<number, EstadoVinculo> = {};
        for (const linha of data as EstadoVinculo[]) {
          mapa[linha.event_id] = linha;
        }
        setVinculos(mapa);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chave já resume ids
  }, [supabase, chave]);

  return vinculos;
}

export function useVinculo(
  supabase: SupabaseClient | null,
  eventId: number | undefined,
): EstadoVinculo | undefined {
  const [vinculo, setVinculo] = useState<EstadoVinculo | undefined>(undefined);

  useEffect(() => {
    if (!supabase || eventId === undefined) return;
    let cancelado = false;
    supabase
      .from("vinculos_institucionais")
      .select("event_id,estado,mapas_id,verificado_em")
      .eq("event_id", eventId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelado) {
          setVinculo((data ?? undefined) as EstadoVinculo | undefined);
        }
      });
    return () => {
      cancelado = true;
    };
  }, [supabase, eventId]);

  return vinculo?.event_id === eventId ? vinculo : undefined;
}

import { createElement } from "react";
import { expect, it, vi } from "vitest";

vi.mock("@expo/ui", () => ({
  Picker: Object.assign("Picker", { Item: "PickerItem" }),
  List: Object.assign("List", { ForEach: "ForEach" }),
  RNHostView: "RNHostView",
}));

import { Collection } from "../src/Collection";
import { Select } from "../src/Select";

it("seleção preserva rótulo, valor e opções e entrega mudanças ao chamador", () => {
  const onValueChange = vi.fn();
  const element = Select({
    accessibilityLabel: "Período",
    value: "hoje",
    onValueChange,
    options: [
      { value: "hoje", label: "Hoje" },
      { value: "amanha", label: "Amanhã" },
    ],
  });
  expect(element.props.accessibilityLabel).toBe("Período");
  expect(element.props.selectedValue).toBe("hoje");
  expect(
    element.props.children.map(
      (opcao: { props: { value: string } }) => opcao.props.value,
    ),
  ).toEqual(["hoje", "amanha"]);
  element.props.onValueChange("amanha");
  expect(onValueChange).toHaveBeenCalledWith("amanha");
});

it("lista preserva identidade, atualização e medição vertical dos cartões", () => {
  const data = [{ id: "1", nome: "Evento" }];
  const onRefresh = vi.fn();
  const keyExtractor = (item: { id: string }) => item.id;
  const renderItem = vi.fn((item: { nome: string }) =>
    createElement("row", { nome: item.nome }),
  );
  const element = Collection({
    data,
    onRefresh,
    keyExtractor,
    renderItem,
    accessibilityLabel: "Agenda",
  });
  expect(element.props.onRefresh).toBe(onRefresh);
  const lista = element.props.children;
  expect(lista.props.data).toBe(data);
  expect(lista.props.keyExtractor).toBe(keyExtractor);
  const row = lista.props.children({ item: data[0] });
  expect(row.props.matchContents).toEqual({ vertical: true });
  expect(row.props.style.width).toBe("100%");
  expect(renderItem).toHaveBeenCalledWith(data[0]);
});

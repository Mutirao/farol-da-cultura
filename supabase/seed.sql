-- Amostra de desenvolvimento da agenda (M1). Tudo aqui é fictício: nunca dados reais.
-- As datas são relativas ao dia em que o banco é recriado, para a agenda sempre ter o que mostrar.
-- A amostra repete de propósito os buracos da fonte real: espaço sem endereço nem coordenada,
-- data sem espaço, sem fim e sem preço, e registros não publicados.

insert into public.categorias (nome) values
  ('Música'), ('Teatro'), ('Dança'), ('Cinema'), ('Literatura'), ('Artes Visuais');

insert into public.espacos
  (fonte, id_externo, nome, descricao, endereco, municipio, latitude, longitude, acessibilidade_fisica, publicado)
values
  ('seed', 'espaco-1', 'Teatro das Marés (fictício)', 'Sala de espetáculos de exemplo, com 200 lugares.',
    'Rua das Jangadas, 100 - Centro', 'Fortaleza', -3.7275, -38.5270,
    array['Rampa de acesso', 'Banheiros adaptados', 'Elevador'], true),
  ('seed', 'espaco-2', 'Praça do Farol Velho (fictícia)', 'Praça de exemplo, com palco aberto.',
    'Avenida da Praia, s/n - Mucuripe', 'Fortaleza', -3.7190, -38.4790,
    array['Rampa de acesso'], true),
  ('seed', 'espaco-3', 'Casa de Cultura do Sertão (fictícia)', 'Casarão de exemplo no interior.',
    'Rua do Açude, 45 - Centro', 'Sobral', -3.6890, -40.3480,
    array['Sinalização tátil', 'Banheiros adaptados'], true),
  ('seed', 'espaco-4', 'Galpão da Ribeira (fictício)', null, null, null, null, null, '{}', true),
  ('seed', 'espaco-5', 'Espaço em revisão (fictício)', 'Não publicado: não pode aparecer no app.',
    'Rua Sem Saída, 1', 'Fortaleza', -3.7400, -38.5400, '{}', false);

insert into public.eventos
  (fonte, id_externo, nome, descricao_curta, descricao_longa, classificacao_etaria, publicado)
values
  ('seed', 'evento-1', 'Sarau das Marés', 'Poesia e música ao vivo, com microfone aberto.',
    'Encontro mensal de poesia falada e canção, com microfone aberto para quem chegar. Dados fictícios.',
    'Livre', true),
  ('seed', 'evento-2', 'Mostra de Curtas do Litoral', 'Sessão de curtas-metragens cearenses.', null, '12 anos', true),
  ('seed', 'evento-3', 'Forró na Praça', 'Trio de forró pé de serra toda semana.', null, 'Livre', true),
  ('seed', 'evento-4', 'Oficina de Xilogravura', 'Oficina prática para iniciantes.',
    'Cada participante grava e imprime a própria matriz. Material incluído. Dados fictícios.', '10 anos', true),
  ('seed', 'evento-5', 'Espetáculo "O Jangadeiro"', 'Teatro de rua sobre o mar e quem vive dele.', null, '14 anos', true),
  ('seed', 'evento-6', 'Roda de Leitura', 'Leitura compartilhada de autoras cearenses.', null, 'Livre', true),
  ('seed', 'evento-7', 'Baile de Dança de Salão', 'Baile aberto, com aula no começo.', null, '16 anos', true),
  ('seed', 'evento-8', 'Cine Sertão', 'Cinema ao ar livre, uma sessão por noite.', null, 'Livre', true),
  ('seed', 'evento-9', 'Concerto de Fim de Tarde', 'Quarteto de cordas ao pôr do sol.', null, 'Livre', true),
  ('seed', 'evento-10', 'Exposição Cores do Cariri', 'Pinturas e esculturas de artistas do Cariri.', null, 'Livre', true),
  ('seed', 'evento-11', 'Contação de Histórias', 'Histórias para crianças e quem mais quiser ouvir.', null, 'Livre', true),
  ('seed', 'evento-12', 'Evento em revisão', 'Não publicado: não pode aparecer no app.', null, 'Livre', false);

insert into public.eventos_categorias (evento_id, categoria_id)
select e.id, c.id
from (values
  ('evento-1', 'Literatura'), ('evento-1', 'Música'),
  ('evento-2', 'Cinema'),
  ('evento-3', 'Música'), ('evento-3', 'Dança'),
  ('evento-4', 'Artes Visuais'),
  ('evento-5', 'Teatro'),
  ('evento-6', 'Literatura'),
  ('evento-7', 'Dança'),
  ('evento-8', 'Cinema'),
  ('evento-9', 'Música'),
  ('evento-10', 'Artes Visuais'),
  ('evento-11', 'Literatura'), ('evento-11', 'Teatro'),
  ('evento-12', 'Música')
) as v (evento, categoria)
join public.eventos e on e.fonte = 'seed' and e.id_externo = v.evento
join public.categorias c on c.nome = v.categoria;

-- Datas avulsas: dia (a partir de hoje), hora de início, duração, espaço, preço.
insert into public.eventos_datas (evento_id, espaco_id, id_externo, inicio, fim, preco, gratuito)
select
  e.id,
  s.id,
  v.id_externo,
  ((current_date + v.dia) + v.hora) at time zone 'America/Fortaleza',
  ((current_date + v.dia) + v.hora + v.duracao) at time zone 'America/Fortaleza',
  v.preco,
  v.gratuito
from (values
  ('evento-1', 'espaco-1', 'avulsa-1', -1, time '19:00', interval '2 hours', 'Gratuito', true),
  ('evento-1', 'espaco-1', 'avulsa-2', 0, time '19:00', interval '2 hours', 'Gratuito', true),
  ('evento-2', 'espaco-1', 'avulsa-3', 0, time '20:30', interval '90 minutes', 'R$ 10,00', false),
  ('evento-2', 'espaco-3', 'avulsa-4', 6, time '19:00', interval '90 minutes', 'R$ 10,00', false),
  ('evento-4', 'espaco-3', 'avulsa-5', 1, time '09:00', interval '3 hours', 'R$ 40,00 (material incluído)', false),
  ('evento-4', 'espaco-3', 'avulsa-6', 8, time '09:00', interval '3 hours', 'R$ 40,00 (material incluído)', false),
  ('evento-5', 'espaco-2', 'avulsa-7', 2, time '17:00', interval '1 hour', 'Gratuito', true),
  ('evento-5', 'espaco-4', 'avulsa-8', 9, time '17:00', interval '1 hour', 'Gratuito', true),
  ('evento-6', 'espaco-1', 'avulsa-9', 3, time '15:00', null, null, null),
  ('evento-7', 'espaco-4', 'avulsa-10', 4, time '21:00', interval '4 hours', 'Pago', false),
  ('evento-9', 'espaco-2', 'avulsa-11', 5, time '17:15', interval '45 minutes', 'Gratuito', true),
  ('evento-9', null, 'avulsa-12', 12, time '17:15', interval '45 minutes', 'Gratuito', true),
  ('evento-10', 'espaco-3', 'avulsa-13', 20, time '10:00', interval '8 hours', 'É gratuita.', true),
  ('evento-11', 'espaco-1', 'avulsa-14', 35, time '10:00', interval '1 hour', 'Gratuito', true),
  ('evento-12', 'espaco-5', 'avulsa-15', 1, time '20:00', interval '1 hour', 'Gratuito', true)
) as v (evento, espaco, id_externo, dia, hora, duracao, preco, gratuito)
join public.eventos e on e.fonte = 'seed' and e.id_externo = v.evento
left join public.espacos s on s.fonte = 'seed' and s.id_externo = v.espaco;

-- Datas recorrentes: o forró toda semana e o cinema ao ar livre todas as noites por dez dias.
insert into public.eventos_datas (evento_id, espaco_id, id_externo, inicio, fim, preco, gratuito)
select
  e.id,
  s.id,
  format('recorrente-%s-%s', v.evento, d.dia),
  ((current_date + d.dia) + v.hora) at time zone 'America/Fortaleza',
  ((current_date + d.dia) + v.hora + v.duracao) at time zone 'America/Fortaleza',
  'Gratuito',
  true
from (values
  ('evento-3', 'espaco-2', time '18:00', interval '3 hours', 0, 28, 7),
  ('evento-8', 'espaco-3', time '19:30', interval '2 hours', 1, 10, 1)
) as v (evento, espaco, hora, duracao, primeiro_dia, ultimo_dia, passo)
cross join lateral generate_series(v.primeiro_dia, v.ultimo_dia, v.passo) as d (dia)
join public.eventos e on e.fonte = 'seed' and e.id_externo = v.evento
join public.espacos s on s.fonte = 'seed' and s.id_externo = v.espaco;

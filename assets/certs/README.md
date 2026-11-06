# Pins e imagens de certificados

Coloque aqui as imagens oficiais dos seus pins da AWS e da Azure (PNG ou SVG, fundo transparente de preferência).

Os arquivos abaixo são lidos automaticamente pela página. Se a imagem não existir, o espaço some sozinho — nada quebrado aparece no site.

## Nomes esperados

| Arquivo | Uso na página |
|---|---|
| `aws-ml-readiness.png` | Curso Exam Readiness: AWS Certified Machine Learning – Specialty (25/06/2024) |
| `aws-cloud-practitioner-essentials.png` | Curso AWS Cloud Practitioner Essentials (05/09/2024) |
| `aws-k8s-serverless.png` | Treinamento Kubernetes / Rancher / Serverless com AWS |
| `azure-az900.png` | Treinamento oficial Azure AZ-900 (KA Solution) |
| `azure-az305.png` | Treinamento oficial Microsoft AZ-305 (durante a Jeitto) |
| `azure-sc200.png` | Treinamento oficial Microsoft SC-200 (durante a Jeitto) |
| `aws-pin-1.png` … `aws-pin-4.png` | Slots extras de pins da AWS |
| `azure-pin-1.png` … `azure-pin-4.png` | Slots extras de pins da Azure |

Tamanho sugerido: 256×256 px ou maior, formato quadrado. Depois de copiar as imagens, publique de novo os arquivos da pasta `assets/certs/` no repositório.

Importante: os itens da AWS listados no CV são **cursos / treinamentos**, não certificações oficiais. Não use arte de “certified” se você ainda não passou no exame.


## Como exibir o pin no site

1. Salve o PNG com um dos nomes da tabela.
2. Abra `pins.json` e inclua o nome do arquivo na lista `files`. Exemplo:

```json
{
  "files": ["azure-az900.png", "aws-pin-1.png"]
}
```

Só os arquivos listados em `pins.json` são carregados. Assim o site não tenta abrir imagens que ainda não existem. Se a imagem listada faltar, o espaço some sozinho.

# MyCar+ V5.57 — pacote-fonte

## Regra vigente dos alertas

O aplicativo utiliza exclusivamente o **novo modelo de alertas técnicos**. A geração automática antiga, os parâmetros técnicos separados e o histórico de alertas de teste foram eliminados do código e do dataset.

No Relatório Executivo, a seção de manutenção lista apenas itens que existem no Cadastro de Itens e possuem alerta do novo modelo cadastrado para o veículo selecionado.

# MyCar+ V5.52 — Pacote-fonte oficial

Pacote consolidado para Web/PWA e Android, com as correções e parametrizações pendentes da V5.41 implantadas.

## Fonte de verdade

- **Raiz do projeto:** fonte oficial editável.
- **`www/`:** cópia sincronizada da fonte oficial para Web/PWA e Capacitor.
- **`android/app/src/main/assets/public/`:** cópia gerada pelo Capacitor para o aplicativo Android.

Não altere manualmente `www/` ou os assets Android. Edite a raiz e execute a sincronização.

## Versão

- Aplicação: **5.52.0**
- Android `versionCode`: **550**
- Android `versionName`: **5.52.0**
- Cache PWA: **mycar-plus-v5-51**
- Esquema de dados/nuvem: **8**

## Atualização automatizada

Na pasta Downloads, mantenha o arquivo `MYCAR_PLUS_V5_51_MASTER.zip` e execute:

```powershell
.\ATUALIZAR_MYCAR_V5_51_WEB_ANDROID.bat
```

O BAT cria backup, instala dependências, sincroniza Web e Android, valida a coesão e gera o APK de teste.

Se o navegador salvar o ZIP com sufixo como `(1)`, o BAT V5.52 localiza automaticamente o arquivo mais recente compatível na pasta Downloads.

## Relatórios V5.52

Os Relatórios Executivo e de Inteligência compartilham arquivos `.html` por meio da ponte nativa `MainActivity.shareHtml`. O arquivo Java correto está incluído no pacote Android.


## Alertas de manutenção V5.52

A V5.52 padroniza os alertas no grupo **MANUTENÇÃO**, mantém o vínculo obrigatório com o veículo selecionado e impede avisos ativos para veículos inativos. A exclusão remove somente o alerta e sua programação futura; os registros do histórico técnico e os movimentos de manutenção são preservados.

O BAT da V5.52 é autocontido e não depende de arquivo `.ps1`.

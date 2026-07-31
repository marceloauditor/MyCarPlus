# MyCar+ V5.51 — Pacote-fonte oficial

Pacote consolidado para Web/PWA e Android, com as correções e parametrizações pendentes da V5.41 implantadas.

## Fonte de verdade

- **Raiz do projeto:** fonte oficial editável.
- **`www/`:** cópia sincronizada da fonte oficial para Web/PWA e Capacitor.
- **`android/app/src/main/assets/public/`:** cópia gerada pelo Capacitor para o aplicativo Android.

Não altere manualmente `www/` ou os assets Android. Edite a raiz e execute a sincronização.

## Versão

- Aplicação: **5.51.0**
- Android `versionCode`: **550**
- Android `versionName`: **5.51.0**
- Cache PWA: **mycar-plus-v5-51**
- Esquema de dados/nuvem: **8**

## Atualização automatizada

Na pasta Downloads, mantenha o arquivo `MYCAR_PLUS_V5_51_MASTER.zip` e execute:

```powershell
.\ATUALIZAR_MYCAR_V5_51_WEB_ANDROID.bat
```

O BAT cria backup, instala dependências, sincroniza Web e Android, valida a coesão e gera o APK de teste.

Se o navegador salvar o ZIP com sufixo como `(1)`, o BAT V5.51 localiza automaticamente o arquivo mais recente compatível na pasta Downloads.

## Relatórios V5.51

Os Relatórios Executivo e de Inteligência compartilham arquivos `.html` por meio da ponte nativa `MainActivity.shareHtml`. O arquivo Java correto está incluído no pacote Android.


## Alertas de manutenção V5.51

A V5.51 padroniza os alertas no grupo **MANUTENÇÃO**, mantém o vínculo obrigatório com o veículo selecionado e impede avisos ativos para veículos inativos. A exclusão remove somente o alerta e sua programação futura; os registros do histórico técnico e os movimentos de manutenção são preservados.

O BAT da V5.51 é autocontido e não depende de arquivo `.ps1`.

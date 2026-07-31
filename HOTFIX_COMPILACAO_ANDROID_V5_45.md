# MyCar+ V5.45 — Hotfix de compilação Android

## Erro corrigido

O método `MainActivity.onDestroy()` estava declarado como `protected`, enquanto `BridgeActivity.onDestroy()` é `public` na versão atual do Capacitor.

Isso provocava o erro:

```text
attempting to assign weaker access privileges; was public
```

## Correção aplicada

```java
@Override
public void onDestroy() {
```

A lógica de destruição da WebView exclusiva de impressão foi preservada.

(function () {
  "use strict";

  const state = {
    coverFactory: null,
    currentHtml: "",
    currentJobName: "MyCarPlus_Relatorio",
    currentTitle: "Relatório MyCar+",
  };

  function nativeBridge() {
    const candidates = [];
    try { candidates.push(window.MyCarNative); } catch (_) {}
    try { if (window.parent && window.parent !== window) candidates.push(window.parent.MyCarNative); } catch (_) {}
    try { if (window.top && window.top !== window) candidates.push(window.top.MyCarNative); } catch (_) {}
    return candidates.find((candidate) => candidate && typeof candidate === "object") || null;
  }

  function notify(message) {
    try { alert(message); } catch (_) { console.warn(message); }
  }

  function isNative() {
    try {
      return Boolean(window.Capacitor?.isNativePlatform?.());
    } catch (_) {
      return false;
    }
  }

  function safeJobName(value) {
    return String(value || "MyCarPlus_Relatorio").trim() || "MyCarPlus_Relatorio";
  }

  function close() {
    const dialog = document.getElementById("reportViewerDialog");
    const frame = document.getElementById("reportViewerFrame");
    document.documentElement.classList.remove("report-viewer-open");
    document.body.classList.remove("report-viewer-open");
    if (dialog?.open) dialog.close();
    if (frame) {
      frame.onload = null;
      frame.srcdoc = "";
    }
    state.currentHtml = "";
  }

  function open(html, options) {
    const content = String(html || "");
    if (!content.trim()) return null;
    const settings = options || {};
    state.currentHtml = content;
    state.currentJobName = safeJobName(settings.jobName);
    state.currentTitle = String(settings.title || "Relatório MyCar+");

    if (isNative()) {
      const dialog = document.getElementById("reportViewerDialog");
      const frame = document.getElementById("reportViewerFrame");
      if (!dialog || !frame) return null;
      frame.title = state.currentTitle;
      document.documentElement.classList.add("report-viewer-open");
      document.body.classList.add("report-viewer-open");
      frame.srcdoc = content;
      if (!dialog.open) dialog.showModal();
      return frame.contentWindow;
    }

    const win = window.open("", "_blank");
    if (!win) {
      alert(settings.popupMessage || "Permita janelas pop-up para abrir o relatório.");
      return null;
    }
    win.document.open();
    win.document.write(content);
    win.document.close();
    return win;
  }

  function print(jobName, html) {
    const reportHtml = String(html || state.currentHtml || "");
    const reportName = safeJobName(jobName || state.currentJobName);
    if (!reportHtml.trim()) {
      notify("Relatório vazio. Não foi possível abrir a impressão.");
      return false;
    }
    const bridge = nativeBridge();
    if (bridge && typeof bridge.printHtml === "function") {
      try {
        bridge.printHtml(reportName, reportHtml);
        return true;
      } catch (error) {
        console.error("Falha ao chamar a impressão nativa:", error);
      }
    }

    const win = window.open("", "_blank");
    if (!win) {
      notify("Não foi possível abrir a impressão nativa. Tente compartilhar o relatório e imprimir pelo navegador.");
      return false;
    }
    win.document.open();
    win.document.write(reportHtml);
    win.document.close();
    win.addEventListener("load", () => setTimeout(() => win.print(), 180), { once: true });
    return true;
  }

  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => resolve(String(reader.result || "").replace(/^data:[^,]+,/, ""));
      reader.readAsDataURL(file);
    });
  }

  async function share(jobName, html) {
    const reportHtml = String(html || state.currentHtml || "");
    const reportName = safeJobName(jobName || state.currentJobName);
    if (!reportHtml.trim()) {
      notify("Relatório vazio. Não foi possível compartilhar.");
      return false;
    }

    let coverFile = null;
    try {
      if (typeof state.coverFactory === "function") {
        coverFile = await state.coverFactory(reportName);
      }
    } catch (error) {
      console.error("Falha ao gerar a capa do relatório:", error);
    }

    const bridge = nativeBridge();
    if (isNative() && bridge) {
      if (coverFile && typeof bridge.shareHtmlWithCover === "function") {
        try {
          const coverBase64 = await fileToBase64(coverFile);
          bridge.shareHtmlWithCover(reportName, reportHtml, coverFile.name, coverBase64);
          return true;
        } catch (error) {
          console.error("Falha no compartilhamento com capa:", error);
        }
      }
      if (typeof bridge.shareHtml === "function") {
        try {
          bridge.shareHtml(reportName, reportHtml);
          return true;
        } catch (error) {
          console.error("Falha no compartilhamento HTML:", error);
        }
      }
      notify("O módulo de compartilhamento não está disponível. Feche e abra novamente o aplicativo.");
      return false;
    }

    const safeName = reportName.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_") || "MyCarPlus_Relatorio";
    const htmlFile = new File([reportHtml], `${safeName}.html`, { type: "text/html;charset=utf-8" });
    const files = coverFile ? [coverFile, htmlFile] : [htmlFile];
    try {
      if (navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({ title: reportName.replaceAll("_", " "), files });
        return true;
      }
    } catch (error) {
      if (error?.name === "AbortError") return false;
      console.error("Falha no compartilhamento Web:", error);
    }
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1800);
    }
    return true;
  }

  function registerCoverFactory(factory) {
    state.coverFactory = typeof factory === "function" ? factory : null;
  }

  window.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data.type === "mycar-close-report") close();
    if (data.type === "mycar-print-report-html") print(data.jobName, data.html);
    if (data.type === "mycar-share-report-html") share(data.jobName, data.html);
  });

  document.addEventListener("DOMContentLoaded", () => {
    const dialog = document.getElementById("reportViewerDialog");
    if (dialog) {
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        close();
      });
    }
  });

  window.MyCarReportManager = Object.freeze({
    open,
    close,
    print,
    share,
    registerCoverFactory,
  });
})();

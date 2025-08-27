class CartaoGiratorio extends HTMLElement {
  static scrollLockCount = 0;
  
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.estaArrastando = false;
    this.rotacaoX = 20;
    this.rotacaoY = 0;
    this.posicaoAnterior = { x: 0, y: 0 };
    this.velocidadeX = 0;
    this.velocidadeY = 0;
    this.temporizadorRotacao = null;
    this.idAnimacao = null;
    this.idDesaceleracao = null;
    this.estaRotacionandoAutomaticamente = false;
    this.ultimoTempoArrastar = 0;
    this.SELETOR_CARTAO = ".cartao";
    this.SENSIBILIDADE_ROTACAO = 0.25;
    this.MAX_ROTACAO_X = 50;
    this.TEMPO_REINICIO = 1800;
    this.ATRITO = 0.6;
    this.VELOCIDADE_MINIMA = 0.1;
    this.frente = null;
    this.verso = null;
    this.regiaoLive = null;
    this.ladoAtual = "frente";
    this.dica = null;
  }
  
  connectedCallback() {
    // Verifica suporte a Web Components
    if (!window.customElements) {
      this.renderizarFallback();
      return;
    }
    
    this.renderizar();
    this.cartaoContainer = this.shadowRoot.querySelector(".cartao-container");
    this.cartao = this.shadowRoot.querySelector(this.SELETOR_CARTAO);
    if (this.cartao) {
      this.frente = this.shadowRoot.querySelector(".frente");
      this.verso = this.shadowRoot.querySelector(".verso");
      this.regiaoLive = this.shadowRoot.querySelector("[aria-live]");
      this.dica = this.shadowRoot.querySelector(".dica-interatividade");
      if (this.hasAttribute("decorative")) {
        this.aplicarModoDecorativo();
      } else {
        this.configurarEventos();
      }
      this.iniciarRotacaoAutomatica();
    }
  }
  
  disconnectedCallback() {
    this.destruir();
  }
  
  renderizar() {
    const imagemFrente = this.getAttribute("front-image");
    const imagemVerso = this.getAttribute("back-image");
    const conteudoFrente = imagemFrente ?
      `<img src="${imagemFrente}" alt="${this.getAttribute("front-label") || "Frente do cartão"}" loading="lazy">` :
      "";
    const conteudoVerso = imagemVerso ?
      `<img src="${imagemVerso}" alt="${this.getAttribute("back-label") || "Verso do cartão"}" loading="lazy">` :
      "";
    const isDecorative = this.hasAttribute("decorative");
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }
        .cartao-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          user-select: none;
          perspective: 1000px;
          width: 100%;
          margin: 2.5rem 0;
          padding: 1.5625rem 0 2.5rem;
          text-align: center;
          scroll-margin-top: 2rem;
        }
        .cartao {
          border-radius: 0.3125rem;
          box-shadow: 6px 6px 12px rgba(186, 190, 204, 0.4),
                      -6px -6px 12px rgba(255, 255, 255, 0.6);
          cursor: grab;
          width: 100%;
          max-width: 18.75rem;
          min-width: 10rem;
          height: auto;
          max-height: 12.5rem;
          min-height: 6rem;
          aspect-ratio: 3 / 2;
          box-sizing: border-box;
          transform-style: preserve-3d;
          -webkit-tap-highlight-color: transparent;
          outline: none;
        }
        .cartao:active {
          cursor: grabbing;
        }
        .cartao:focus-visible {
          outline: 3px solid #007bff;
          outline-offset: 4px;
          box-shadow: 0 0 10px rgba(0, 123, 255, 0.5);
        }
        @media (prefers-color-scheme: dark) {
          .cartao {
            box-shadow: 6px 6px 12px rgba(0, 0, 0, 0.5),
                        -6px -6px 12px rgba(55, 55, 55, 0.3);
          }
          .cartao:focus-visible {
            outline: 4px solid #ff4500;
            outline-offset: 6px;
            box-shadow: 0 0 15px rgba(255, 69, 0, 0.6);
            transition: outline 0.2s ease, box-shadow 0.2s ease;
          }
        }
        .frente,
        .verso {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 0.3125rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--cartao-cor-frente, #ff3333);
        }
        .frente img {
          border-radius: 0.3125rem;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .verso img {
          border-radius: 0.3125rem;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .frente img, .verso img {
          image-rendering: high-quality;
        }
        .verso {
          transform: rotateY(180deg);
          z-index: 1;
          background: var(--cartao-cor-verso, #ff3333);
        }
        @media (prefers-reduced-motion: reduce) {
          .cartao {
            transition: transform 0.01s linear;
          }
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        .carteirinha {
          border-bottom: 0.0625rem solid var(--rosinha);
          border-top: 0.0625rem solid var(--rosinha);
          padding: 1.5625rem 0 2.5rem;
        }
        .carteirinha h2 {
          color: var(--cor-principal);
          font-size: 1.4375rem;
          margin-bottom: 1.25rem;
        }
        .dica-interatividade {
          position: absolute;
          bottom: 80px;
          background: linear-gradient(135deg, rgba(34,34,34,0.7) 0%, rgba(50,50,50,0.7) 50%, rgba(34,34,34,0.7) 100%);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          color: white;
          padding: 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-family: system-ui, sans-serif;
          line-height: 1.2;
          opacity: 1;
          transition: opacity 0.3s ease;
          pointer-events: none;
          z-index: 10;
        }
        .dica-interatividade.hidden {
          opacity: 0;
        }
        @media (prefers-color-scheme: dark) {
          .dica-interatividade {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .dica-interatividade {
            transition: none;
          }
        }
        @media (max-width: 360px) {
          .cartao {
            max-width: 16rem;
            min-width: 8rem;
          }
          .dica-interatividade {
            font-size: 0.65rem;
            padding: 2px 5px;
          }
        }
      </style>
      <div class="cartao-container" ${isDecorative ? 'aria-hidden="true"' : 'aria-label="Cartão interativo 3D, pode ser girado para exibir frente e verso." role="region"'}>
        <div class="dica-interatividade" aria-hidden="true">Arraste ou use as setas após Tab para girar</div>
        <figure class="cartao" ${isDecorative ? 'aria-hidden="true" tabindex="0"' : 'role="group" aria-label="Cartão 3D interativo" tabindex="0"'}>
          <div class="frente" ${isDecorative ? 'aria-hidden="true"' : 'role="img" aria-label="' + (this.getAttribute("front-label") || "Frente do cartão") + '" aria-hidden="false"'}>
            ${conteudoFrente}
          </div>
          <div class="verso" ${isDecorative ? 'aria-hidden="true"' : 'role="img" aria-label="' + (this.getAttribute("back-label") || "Verso do cartão") + '" aria-hidden="true"'}>
            ${conteudoVerso}
          </div>
        </figure>
        ${isDecorative ? '' : '<div aria-live="polite" class="sr-only"></div>'}
      </div>
    `;
  }
  
  renderizarFallback() {
    const imagemFrente = this.getAttribute("front-image");
    const frontLabel = this.getAttribute("front-label") || "Frente do cartão";
    const isDecorative = this.hasAttribute("decorative");
    const hasImage = !!imagemFrente;
    
    this.innerHTML = `
    <style>
      .fallback-cartao {
        display: block;
        width: 100%;
        max-width: 18.75rem;
        min-width: 10rem;
        height: auto;
        max-height: 12.5rem;
        min-height: 6rem;
        aspect-ratio: 3 / 2;
        margin: 2.5rem auto;
        padding: 1.5625rem 0 2.5rem;
        text-align: center;
        background: ${hasImage ? 'none' : 'var(--cartao-cor-frente, #fda233)'};
        border-radius: 0.3125rem;
      }
      .fallback-cartao img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 0.3125rem;
      }
    </style>
    <div class="fallback-cartao" ${isDecorative ? 'aria-hidden="true"' : `aria-label="${frontLabel}"`}>
      ${hasImage ? `<img src="${imagemFrente}" ${isDecorative ? 'aria-hidden="true"' : `alt="${frontLabel}"`}>` : ''}
    </div>
  `;
  }
  
  aplicarModoDecorativo() {
    if (this.cartao) {
      this.cartao.setAttribute("tabindex", "0");
      this.configurarEventos();
    }
  }
  
  aplicarOverflowOculto() {
    const isTouchDevice = 'ontouchstart' in window;
    if (!isTouchDevice) return;
    if (CartaoGiratorio.scrollLockCount++ === 0) {
      this.overflowAnterior = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
  }
  
  restaurarOverflow() {
    const isTouchDevice = 'ontouchstart' in window;
    if (!isTouchDevice) return;
    if (--CartaoGiratorio.scrollLockCount === 0) {
      document.body.style.overflow = this.overflowAnterior || "";
    }
  }
  
  estaMostrandoVerso() {
    const rotacaoYNormalizada = ((this.rotacaoY % 360) + 360) % 360;
    return rotacaoYNormalizada > 90 && rotacaoYNormalizada < 270;
  }
  
  aplicarTransformacao() {
    this.cartao.style.transform = `rotateY(${this.rotacaoY}deg) rotateX(${this.rotacaoX}deg)`;
    if (!this.hasAttribute("decorative")) {
      const mostrandoVerso = this.estaMostrandoVerso();
      const novoLado = mostrandoVerso ? "verso" : "frente";
      if (novoLado !== this.ladoAtual) {
        this.frente.setAttribute(
          "aria-hidden",
          mostrandoVerso ? "true" : "false"
        );
        this.verso.setAttribute("aria-hidden", mostrandoVerso ? "false" : "true");
        if (this.regiaoLive) {
          this.regiaoLive.textContent = mostrandoVerso ?
            (this.getAttribute("back-label") || "Mostrando verso do cartão.") :
            (this.getAttribute("front-label") || "Mostrando frente do cartão.");
        }
        this.ladoAtual = novoLado;
      }
    }
  }
  
  desacelerar(tempoAtual) {
    if (
      !this.estaArrastando &&
      (Math.abs(this.velocidadeX) > this.VELOCIDADE_MINIMA ||
        Math.abs(this.velocidadeY) > this.VELOCIDADE_MINIMA)
    ) {
      this.rotacaoY += this.velocidadeX;
      this.rotacaoX += this.velocidadeY;
      this.velocidadeX *= this.ATRITO;
      this.velocidadeY *= this.ATRITO;
      this.rotacaoX = Math.max(
        -this.MAX_ROTACAO_X,
        Math.min(this.MAX_ROTACAO_X, this.rotacaoX)
      );
      this.aplicarTransformacao();
      this.idDesaceleracao = requestAnimationFrame((tempo) =>
        this.desacelerar(tempo)
      );
    } else {
      this.velocidadeX = 0;
      this.velocidadeY = 0;
      this.idDesaceleracao = null;
    }
  }
  
  rotacionarAutomaticamente() {
    if (!this.estaRotacionandoAutomaticamente || this.estaArrastando) {
      this.idAnimacao = null;
      return;
    }
    
    if (Math.abs(this.rotacaoY) > 360 * 10) {
      this.rotacaoY = this.rotacaoY % 360;
    }
    
    this.rotacaoY = +(this.rotacaoY + 0.5).toFixed(2);
    this.aplicarTransformacao();
    this.idAnimacao = requestAnimationFrame(() =>
      this.rotacionarAutomaticamente()
    );
  }
  
  iniciarRotacaoAutomatica() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    
    this.pararRotacaoAutomatica();
    this.estaRotacionandoAutomaticamente = true;
    this.idAnimacao = requestAnimationFrame(() =>
      this.rotacionarAutomaticamente()
    );
  }
  
  pararRotacaoAutomatica() {
    if (this.idAnimacao) {
      cancelAnimationFrame(this.idAnimacao);
      this.idAnimacao = null;
    }
    this.estaRotacionandoAutomaticamente = false;
  }
  
  iniciarArrastar(x, y) {
    this.estaArrastando = true;
    this.posicaoAnterior = { x, y };
    this.aplicarOverflowOculto();
    this.cartao.style.transition = "none";
    this.ultimoTempoArrastar = performance.now();
    this.velocidadeX = 0;
    this.velocidadeY = 0;
    if (this.idDesaceleracao) {
      cancelAnimationFrame(this.idDesaceleracao);
      this.idDesaceleracao = null;
    }
    this.pararRotacaoAutomatica();
    if (this.temporizadorRotacao) {
      clearTimeout(this.temporizadorRotacao);
      this.temporizadorRotacao = null;
    }
    if (this.dica) {
      this.dica.classList.add("hidden");
    }
  }
  
  moverArrastar(x, y) {
    if (!this.estaArrastando) return;
    const tempoDelta = performance.now() - this.ultimoTempoArrastar;
    if (tempoDelta <= 0) return;
    const deltaX = (x - this.posicaoAnterior.x) * this.SENSIBILIDADE_ROTACAO;
    let deltaY = (y - this.posicaoAnterior.y) * this.SENSIBILIDADE_ROTACAO;
    if (this.estaMostrandoVerso()) deltaY = -deltaY;
    this.velocidadeX = (deltaX / tempoDelta) * 15;
    this.velocidadeY = (-deltaY / tempoDelta) * 15;
    this.rotacaoY += deltaX;
    this.rotacaoX = Math.max(
      -this.MAX_ROTACAO_X,
      Math.min(this.MAX_ROTACAO_X, this.rotacaoX - deltaY)
    );
    this.posicaoAnterior = { x, y };
    this.ultimoTempoArrastar = performance.now();
    this.aplicarTransformacao();
  }
  
  finalizarArrastar() {
    if (!this.estaArrastando) return;
    this.estaArrastando = false;
    this.restaurarOverflow();
    this.cartao.style.transition = "transform 0.05s ease-out";
    if (
      Math.abs(this.velocidadeX) > this.VELOCIDADE_MINIMA ||
      Math.abs(this.velocidadeY) > this.VELOCIDADE_MINIMA
    ) {
      this.idDesaceleracao = requestAnimationFrame((tempo) =>
        this.desacelerar(tempo)
      );
    }
    if (this.temporizadorRotacao) {
      clearTimeout(this.temporizadorRotacao);
    }
    this.temporizadorRotacao = setTimeout(() => {
      if (!this.estaArrastando) {
        this.estaRotacionandoAutomaticamente = true;
        this.iniciarRotacaoAutomatica();
      }
    }, this.TEMPO_REINICIO);
  }
  
  obterCoordenadas(e) {
    const toque = e.touches?.[0] || e;
    return { x: toque.clientX, y: toque.clientY };
  }
  
  manipularInicio(e) {
    if (e.target.closest(".cartao")) {
      e.preventDefault();
      const { x, y } = this.obterCoordenadas(e);
      this.iniciarArrastar(x, y);
    }
  }
  
  manipularMovimento(e) {
    if (!this.estaArrastando) return;
    e.preventDefault();
    const { x, y } = this.obterCoordenadas(e);
    this.moverArrastar(x, y);
  }
  
  manipularFim() {
    this.finalizarArrastar();
  }
  
  manipularTeclado(e) {
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.pararRotacaoAutomatica();
    if (this.dica) this.dica.classList.add("hidden");
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (reducedMotion) {
        this.cartao.style.transition = "none";
      }
      this.rotacaoY += 180;
      this.aplicarTransformacao();
      if (reducedMotion) {
        setTimeout(() => {
          this.cartao.style.transition = "transform 0.05s ease-out";
        }, 0);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.rotacaoY -= 10;
      this.aplicarTransformacao();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      this.rotacaoY += 10;
      this.aplicarTransformacao();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.rotacaoX = Math.min(this.MAX_ROTACAO_X, this.rotacaoX + 10);
      this.aplicarTransformacao();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      this.rotacaoX = Math.max(-this.MAX_ROTACAO_X, this.rotacaoX - 10);
      this.aplicarTransformacao();
    }
    this.reiniciarRotacaoAutomatica();
  }
  
  configurarEventos() {
    // Eventos no cartao-container em vez de globalmente
    this.cartaoContainer.addEventListener("mousedown", (e) => this.manipularInicio(e));
    this.cartaoContainer.addEventListener("touchstart", (e) => this.manipularInicio(e), {
      passive: false,
    });
    this.cartaoContainer.addEventListener("mousemove", (e) => this.manipularMovimento(e), {
      passive: false,
    });
    this.cartaoContainer.addEventListener("touchmove", (e) => this.manipularMovimento(e), {
      passive: false,
    });
    this.cartaoContainer.addEventListener("mouseup", () => this.manipularFim());
    this.cartaoContainer.addEventListener("touchend", () => this.manipularFim());
    this.cartaoContainer.addEventListener("mouseleave", () => this.manipularFim());
    this.cartao.addEventListener("keydown", (e) => this.manipularTeclado(e));
  }
  
  removerEventos() {
    this.cartaoContainer.removeEventListener("mousedown", (e) => this.manipularInicio(e));
    this.cartaoContainer.removeEventListener("touchstart", (e) => this.manipularInicio(e));
    this.cartaoContainer.removeEventListener("mousemove", (e) => this.manipularMovimento(e));
    this.cartaoContainer.removeEventListener("touchmove", (e) => this.manipularMovimento(e));
    this.cartaoContainer.removeEventListener("mouseup", () => this.manipularFim());
    this.cartaoContainer.removeEventListener("touchend", () => this.manipularFim());
    this.cartaoContainer.removeEventListener("mouseleave", () => this.manipularFim());
    this.cartao.removeEventListener("keydown", (e) => this.manipularTeclado(e));
  }
  
  destruir() {
    this.removerEventos();
    this.pararRotacaoAutomatica();
    if (this.idDesaceleracao) {
      cancelAnimationFrame(this.idDesaceleracao);
      this.idDesaceleracao = null;
    }
    if (this.temporizadorRotacao) {
      clearTimeout(this.temporizadorRotacao);
      this.temporizadorRotacao = null;
    }
    if (this.estaArrastando) {
      this.restaurarOverflow();
    }
  }
}

customElements.define("cartao-giratorio", CartaoGiratorio);
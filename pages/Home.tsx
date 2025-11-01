import React from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  return (
    <div className="home-wrapper">
      <div className="menu-button">☰</div>
      <header className="site-header">
        <img src="/laplapla-logo.webp" alt="Логотип ЛапЛапЛа" className="site-logo" />
        <div className="header-text">
          <h1 className="title">ЛапЛапЛа</h1>
          <h2 className="subtitle">лапусечный эрудитор для детей и взрослых</h2>
        </div>
      </header>
      <div className="grid">
        <div className="card" onClick={() => router.push("/cat")}>
          <img src="/images/cat.webp" alt="Котики объяснят" />
          <div className="label">Котики объяснят</div>
        </div>
        <div className="card" onClick={() => router.push("/dog")}>
          <img src="/images/dog.webp" alt="Пёсики нарисуют" />
          <div className="label">Пёсики нарисуют</div>
        </div>
        <div className="card" onClick={() => router.push("/capybara")}>
          <img src="/images/capybara.webp" alt="Капибары расскажут" />
          <div className="label">Капибары расскажут</div>
        </div>
        <div className="card" onClick={() => router.push("/parrots")}>
          <img src="/images/parrot.webp" alt="Попугайчики поют" />
          <div className="label">Попугайчики поют</div>
        </div>
        <div className="card" onClick={() => router.push("/raccoons")}>
          <img src="/images/raccoon.webp" alt="Енотики найдут" />
          <div className="label">Енотики найдут</div>
        </div>
        <div className="card mystery-card">
          <div className="mystery-container">
            <img src="/images/paw.webp" alt="paw" className="paw" />
            <img src="/images/mystery.webp" alt="curtain" className="curtain" />
          </div>
          <div className="label">Появится позже</div>
        </div>
      </div>
    </div>
  );
}
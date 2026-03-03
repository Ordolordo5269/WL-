# Deploy Guide — WorldLore

## Paso 1: Railway (Backend)

1. Ir a https://railway.app → "New Project" → "Deploy from GitHub repo"
2. Seleccionar el repo de WorldLore
3. En "Root Directory" poner: `backend`
4. Railway detecta el `railway.toml` automáticamente
5. En la pestaña **Variables**, añadir estas:

```
NODE_ENV=production
DATABASE_URL=postgresql://postgres:XD146yBn02VomWTt9x0diVko9CMeiMHWEiaTCMK67pZUqnbWfIwFhAdeiQvM3MPY@116.203.82.200:5432/postgres?schema=public
JWT_SECRET=b23fc3b52fbb26937578300ae1a36efe78f3c86edf1bda6a4b3197448cce16a78c0e1c762b6fa441d98f8e96ba624a7d4250a3a03c21310119a7f2b3104a2600
NEWS_API_KEY=293aef4458c249c29d718a7664779a30
DEEPSEEK_API_KEY=sk-2499759864814b9ab9f555a562387e6b
RAPIDAPI_KEY=2e828c2f6bmsh7314424402f4b69p1204f6jsne239eed98880
ACLED_EMAIL=andres.ordonez@alumno.ucjc.edu
ACLED_PASSWORD=Andresmoni.0508_
MAPBOX_TOKEN=pk.eyJ1IjoiYW5kcmVzb29kIiwiYSI6ImNtNWNtMmd4dzJlZmQybXFyMGJuMDFxemsifQ.t4UlHVJhUi9ntjG5Tiq5_A
```

6. Después de que se despliegue, copiar la URL pública (ej: `https://wl-backend.railway.app`)
7. Añadir también estas dos variables con esa URL:
```
CORS_ORIGIN=https://<tu-proyecto>.vercel.app
API_BASE_URL=https://wl-backend.railway.app
```

---

## Paso 2: Vercel (Frontend)

1. Ir a https://vercel.com → "New Project" → importar el repo
2. En "Root Directory" poner: `frontend`
3. Framework: Vite (se detecta solo)
4. En **Environment Variables**, añadir:

```
VITE_API_URL=https://wl-backend.railway.app
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiYW5kcmVzb29kIiwiYSI6ImNtNWNtMmd4dzJlZmQybXFyMGJuMDFxemsifQ.t4UlHVJhUi9ntjG5Tiq5_A
```

5. Deploy → copiar la URL pública (ej: `https://worldlore.vercel.app`)
6. Volver a Railway y actualizar `CORS_ORIGIN` con esa URL exacta

---

## Paso 3: Verificar

- Abrir la URL de Vercel en el navegador
- Probar login
- Probar que el mapa carga
- Probar `https://wl-backend.railway.app/test` — debe responder `{"message":"Server is working!"}`

---

## Notas

- El repo de GitHub debe estar en **privado** para que el código no sea visible públicamente
- Las actualizaciones se despliegan automáticamente con cada `git push`
- El tier gratuito de Railway tiene 500 horas/mes — suficiente para un equipo pequeño

# Démo Nuxt 3 + Refuges.info

1. Créer le projet :
   ```bash
   npx nuxi@latest init refuges-info-demo
   cd refuges-info-demo
   # remplacez les fichiers par ceux de ce dépôt / ce gist
   npm i
   npm run dev
   ```
2. Par défaut, les appels passent via les routes Nitro (`/api/refuges/*`), évitant d’éventuels soucis CORS.
3. Pour appeler directement l’API côté client, définissez `NUXT_PUBLIC_API_BASE=https://www.refuges.info/api` dans `.env`.
4. Ouvrez http://localhost:3000 : déplacez la carte, les points se chargent par BBOX.
5. Cliquez un marqueur pour aller à la page détail (JSON brut pour la démo).

### Idées d’extensions rapides
- Ajouter un sélecteur `type_points` (cabane, refuge, gite, pt_eau, …)
- Remplacer la popup brute par une fiche (altitude, places, couverture, etc.) à partir du `detail=complet`.
- Charger les massifs depuis `/api/polygones` et permettre un filtrage par massif.
- Ajouter un cache simple (e.g. `cachedBboxes` en `Map<string,RefugeGeoJSON>`).

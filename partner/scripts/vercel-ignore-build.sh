#!/bin/bash
# IL PORTALE SI COSTRUISCE SOLO SE partner/ È CAMBIATA DALL'ULTIMO DEPLOY.
#
# È l'«Ignored Build Step» di Vercel (lo punta vercel.json qui accanto):
#   exit 0 = salta la build, exit 1 = costruisci.
# Serve perché il portale vive su `main` insieme all'app Expo, e ogni push
# dell'app farebbe una build inutile del portale.
#
# PERCHÉ NON PIÙ `git diff --quiet HEAD^ HEAD -- .` (la regola di prima): guardava
# solo l'ULTIMO commit del push. Un push di più commit con l'ultimo fuori da
# partner/ (una migration, TODO.md) veniva annullato, e si portava via anche i
# commit sotto: in produzione restava la versione vecchia. Successo il 23/08 e
# di nuovo il 19/09.
#
# ADESSO si confronta con l'ultimo commit andato online su questo branch, che
# Vercel passa qui in VERCEL_GIT_PREVIOUS_SHA. Nel dubbio si COSTRUISCE: una
# build in più costa un minuto, una versione vecchia online costa un errore
# che non si vede.

prima="${VERCEL_GIT_PREVIOUS_SHA}"

if [ -z "$prima" ]; then
  echo "Nessun deploy precedente su questo branch: costruisco."
  exit 1
fi

# Vercel clona il repo solo in parte: il commit dell'ultimo deploy può non
# esserci ancora. Si prova a scaricarlo; se non si riesce, si costruisce.
if ! git cat-file -e "${prima}^{commit}" 2>/dev/null; then
  git fetch --quiet --depth=500 origin "${VERCEL_GIT_COMMIT_REF}" 2>/dev/null || true
fi
if ! git cat-file -e "${prima}^{commit}" 2>/dev/null; then
  echo "Il commit dell'ultimo deploy (${prima}) non è raggiungibile: costruisco."
  exit 1
fi

if git diff --quiet "$prima" HEAD -- .; then
  echo "partner/ è uguale all'ultimo deploy (${prima}): salto la build."
  exit 0
fi

echo "partner/ è cambiata dall'ultimo deploy (${prima}): costruisco."
exit 1

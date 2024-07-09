const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config(); // Chargement des variables d'environnement depuis .env

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Servir les fichiers statiques (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "public")));

// Liste pour stocker les numéros de suivi soumis pendant la session
let submittedTrackingNumbers = new Set();

// Middleware de vérification de mot de passe
function verifyPassword(req, res, next) {
  const motDePasseSoumis = req.body.mot_de_passe; // Récupération du mot de passe soumis dans le formulaire
  const motDePasseAttendu = process.env.MOT_DE_PASSE; // Récupération du mot de passe depuis .env

  if (!motDePasseSoumis || motDePasseSoumis !== motDePasseAttendu) {
    return res.status(401).send("Accès non autorisé. Mot de passe incorrect.");
  }

  // Si le mot de passe est correct, passez à la prochaine étape de middleware
  next();
}

// Route pour gérer la soumission du formulaire avec vérification de mot de passe
app.post("/submit", verifyPassword, (req, res) => {
  const data = req.body;
  const numSuivi = data.num_suivi;

  // Lire les données existantes du fichier Lucasdb.json
  const dbPath = path.join(__dirname, "Lucasdb.json");
  let existingData = [];
  if (fs.existsSync(dbPath)) {
    const fileContent = fs.readFileSync(dbPath, "utf-8");
    existingData = JSON.parse(fileContent || "[]");
  }

  // Vérifier si le numéro de suivi est déjà présent dans la base de données
  const isDuplicate = existingData.some((item) => item.num_suivi === numSuivi);
  if (isDuplicate) {
    // Rediriger vers Retrait.html avec les données en paramètres de l'URL
    const item = existingData.find((item) => item.num_suivi === numSuivi);
    const queryParams = new URLSearchParams(item).toString();
    return res.redirect(`/Retrait.html?${queryParams}`);
  }

  // Ajouter le numéro de suivi à la liste des soumis
  submittedTrackingNumbers.add(numSuivi);

  // Ajouter les nouvelles données
  existingData.push(data);

  // Écrire les données mises à jour dans le fichier
  fs.writeFileSync(dbPath, JSON.stringify(existingData, null, 2));

  // Rediriger l'utilisateur vers la page d'impression
  res.redirect(`/print/${numSuivi}`);
});

// Route pour générer la page d'impression
app.get("/print/:num_suivi", (req, res) => {
  const numSuivi = req.params.num_suivi;

  // Lire les données existantes du fichier Lucasdb.json
  const dbPath = path.join(__dirname, "Lucasdb.json");
  if (fs.existsSync(dbPath)) {
    const fileContent = fs.readFileSync(dbPath, "utf-8");
    const existingData = JSON.parse(fileContent || "[]");

    // Trouver les données correspondant au BILLOT LOADING N°
    const item = existingData.find((data) => data.num_suivi === numSuivi);

    if (item) {
      // Rediriger vers la page d'impression avec les données en paramètres de l'URL
      const queryParams = new URLSearchParams(item).toString();
      res.redirect(`/send.html?${queryParams}`);
    } else {
      res.status(404).send("Aucune donnée trouvée pour ce BILLOT LOADING N°.");
    }
  } else {
    res
      .status(500)
      .send(
        "Erreur interne du serveur. Impossible de lire la base de données."
      );
  }
});

// Route pour rechercher les données par BILLOT LOADING N°
app.get("/search/:num_suivi", (req, res) => {
  const numSuiviRecherche = req.params.num_suivi;

  // Lire les données existantes du fichier Lucasdb.json
  const dbPath = path.join(__dirname, "Lucasdb.json");
  if (fs.existsSync(dbPath)) {
    const fileContent = fs.readFileSync(dbPath, "utf-8");
    const existingData = JSON.parse(fileContent || "[]");

    // Recherche des données correspondant au BILLOT LOADING N°
    const searchData = existingData.filter(
      (item) => item.num_suivi === numSuiviRecherche
    );

    if (searchData.length > 0) {
      res.json(searchData); // Envoyer les données trouvées en tant que réponse JSON
    } else {
      res.status(404).send("Aucune donnée trouvée pour ce BILLOT LOADING N°.");
    }
  } else {
    res
      .status(500)
      .send(
        "Erreur interne du serveur. Impossible de lire la base de données."
      );
  }
});

// Route pour gérer la suppression du colis avec vérification de mot de passe
app.delete("/remove", verifyPassword, (req, res) => {
  const { num_suivi, mot_de_passe } = req.body;

  // Lire les données existantes du fichier Lucasdb.json
  const dbPath = path.join(__dirname, "Lucasdb.json");
  if (fs.existsSync(dbPath)) {
    const fileContent = fs.readFileSync(dbPath, "utf-8");
    let existingData = JSON.parse(fileContent || "[]");

    // Filtrer les données pour supprimer le colis correspondant
    const newData = existingData.filter((item) => item.num_suivi !== num_suivi);

    // Écrire les données mises à jour dans le fichier
    fs.writeFileSync(dbPath, JSON.stringify(newData, null, 2));

    // Retourner un message de confirmation
    res.send("Colis retiré de la base de donnée avec succès");
  } else {
    res
      .status(500)
      .send(
        "Erreur interne du serveur. Impossible de lire la base de données."
      );
  }
});

app.listen(PORT, () => {
  console.log(`Le serveur marche au port http://localhost:${PORT}`);
});

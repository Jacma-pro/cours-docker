# Conteneurisation

## J1
### Commande de base de terminal

```bash

pwd                                 # Affiche le répertoire de travail actuel
ls -la                              # Liste les fichiers et dossiers dans le répertoire actuel avec des détails
cd <dossier>                        # Change le répertoire de travail actuel vers <répertoire>

curl -i http://localhost:8080       # Effectue une requête HTTP GET vers l'URL spécifiée et affiche les en-têtes de réponse (-i = inclure les en-têtes)
```

```bash
# Construire l'image Docker à partir du Dockerfile
docker build -t nom_de_l_image .

# Lister les images Docker disponibles
docker images

# Lister les conteneurs en cours d'exécution
docker ps

# Lister tous les conteneurs (en cours d'exécution et arrêtés)
docker ps -a

# Démarrer un conteneur à partir d'une image
docker run -d --name nom_du_conteneur nom_de_l_image

# Arrêter un conteneur en cours d'exécution
docker stop nom_du_conteneur

# Supprimer un conteneur
docker rm nom_du_conteneur

# Supprimer une image Docker
docker rmi nom_de_l_image

docker run -d -p 80:80 docker/getting-started  # Démarrer un conteneur en arrière-plan et mapper le port 80 du conteneur au port 80 de l'hôte

docker build -t mon_image .  # Construire une image Docker à partir du Dockerfile dans le répertoire actuel et la nommer "mon_image"
```

### prise de note générale

- Docker est un outil de conteneurisation qui permet de créer, déployer et gérer des applications dans des conteneurs.
- Un conteneur est une instance isolée d'une application qui inclut tout ce qui est nécessaire pour l'exécuter, y compris le code, les dépendances et la configuration.
- Un image Docker est un fichier statique qui contient toutes les informations nécessaires pour créer un conteneur.
- Le fichier Dockerfile est utilisé pour définir comment construire une image Docker.
- La commande `docker build` permet de construire une image à partir d'un Dockerfile.
- La commande `docker run` permet de démarrer un conteneur à partir d'une image.
    - L'option `-d` permet de démarrer le conteneur en arrière-plan (mode détaché).
    - L'option `--name` permet de donner un nom au conteneur.
    - L'option `-p` permet de mapper un port du conteneur à un port de l'hôte.
- La commande `docker ps` permet de lister les conteneurs en cours d'exécution.
- La commande `docker ps -a` permet de lister tous les conteneurs (en cours d'exécution et arrêtés).
- La commande `docker stop` permet d'arrêter un conteneur en cours d'exécution.
- La commande `docker rm` permet de supprimer un conteneur.
- La commande `docker rmi` permet de supprimer une image Docker.

### Trois objets à dinstinguer

- image : un fichier statique qui contient tout ce qui est nécessaire pour créer un conteneur.
- conteneur : une instance en cours d'exécution d'une image Docker.
- Dockerfile : un fichier texte qui contient les instructions pour construire une image Docker.


### Docker vs VM

![alt text](images/image.png)

### Ce que apporte Docker au projet

- Décrire les dépendances d'éxecution
- Construire une version et la distribuer via un registre (DockerHub, GitHub Container Registry, etc.)
- Lanceer plusieurs instances sans réinstaller l'application

### Important pour MAC

Pour pull sur render, il faut que ça soit en amd64.

```bash
docker buildx build --platform linux/amd64 -t <image_name> .

docker push <image_name>
```
### Installer docker sur machine ssh debian

```bash
apt install -y docker.io
systemctl enable docker
systemctl start docker
```
#### récuperr une image depuis dockerhub

```bash
docker pull jacma38/app-dodo
```
et run cette image pour y accéder en ligne de commande

```bash
docker run -dp 40269:3000 jacma38/app-dodo
```

#### Installer portainer

```bash
docker pull portainer/portainer
docker volume create portainer_data
docker run -dp 443:9443 --name portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer
```

### Construire un Dockerfile

Exemple de la J1 : le Dockerfile de l'application « todo » (`app/Dockerfile`), une app Node/Express qui écoute sur le port 3000.

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json .
RUN yarn install --production
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]
```

Chaque instruction crée une **couche** de l'image :

| Instruction | Rôle | Dans l'exemple |
|---|---|---|
| `FROM` | Image de départ | `node:24-alpine` : Node.js sur Alpine Linux, une base très légère |
| `WORKDIR` | Dossier de travail dans l'image (créé s'il n'existe pas) | `/app` |
| `COPY` | Copie des fichiers de la machine vers l'image | d'abord `package*.json`, puis tout le code |
| `RUN` | Exécute une commande **pendant le build** | `yarn install --production` installe les dépendances |
| `EXPOSE` | Documente le port d'écoute (ne publie rien, c'est `-p` qui publie) | `3000` |
| `CMD` | Commande lancée **au démarrage du conteneur** | `node src/index.js` |

Points importants :

- **Ordre des instructions et cache** : on copie d'abord `package*.json`, on installe les dépendances, et seulement ensuite on copie le code (`COPY . .`). Tant que les dépendances ne changent pas, Docker réutilise le cache et le rebuild est rapide.
- **`--production`** : n'installe que les `dependencies` et ignore les `devDependencies` (`jest`, `nodemon`, `prettier`). L'image est plus légère.
- **`RUN` ≠ `CMD`** : `RUN` s'exécute une fois à la construction de l'image, `CMD` à chaque démarrage d'un conteneur.
- **Port** : l'app fait `app.listen(3000)`. C'est ce port de conteneur qu'on relie à un port de l'hôte, comme dans `docker run -dp 40269:3000 jacma38/app-dodo`.
- **`.dockerignore`** : liste ce qui ne doit pas être copié par `COPY . .` (`node_modules`, `.git`). Celui de `app/` est vide pour l'instant.

Construire et lancer cette image :

```bash
docker build -t app-dodo .
docker run -dp 3000:3000 app-dodo
```

### Persistance des données

- `src/persistence/index.js` choisit la base : **MySQL** si la variable d'environnement `MYSQL_HOST` est définie, sinon **SQLite**, dont le fichier est dans `/etc/todos/todo.db`.
- Ce fichier est dans le système de fichiers du conteneur : si on supprime le conteneur (`docker rm`), les données disparaissent. Un **volume** permet de les garder en dehors du conteneur.

```bash
docker run -dp 3000:3000 -v todo-db:/etc/todos app-dodo   # volume nommé monté sur le dossier de la base
```

### Commandes utiles en plus

```bash
docker logs nom_du_conteneur         # Affiche les logs du conteneur (-f pour les suivre)
docker exec -it nom_du_conteneur sh  # Ouvre un shell dans un conteneur en cours d'exécution
```

## Résumé J1

La conteneurisation avec Docker permet de créer, distribuer et exécuter une application dans un environnement isolé et reproductible. Une image sert de modèle, un conteneur est une instance de cette image, et le Dockerfile décrit sa construction.

Les commandes essentielles permettent de construire une image (`docker build`), de lancer et gérer des conteneurs (`docker run`, `docker ps`, `docker stop`, `docker rm`) ainsi que de gérer les images (`docker images`, `docker rmi`). Les ports peuvent être exposés avec l'option `-p`.

Pour déployer sur Render depuis un Mac, l'image doit être construite pour la plateforme `linux/amd64`, puis publiée dans un registre. La séance a également abordé l'installation de Docker sur Debian, la récupération d'une image Docker Hub et l'installation de Portainer pour administrer les conteneurs.


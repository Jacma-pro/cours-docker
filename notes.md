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

## Résumé J1

La conteneurisation avec Docker permet de créer, distribuer et exécuter une application dans un environnement isolé et reproductible. Une image sert de modèle, un conteneur est une instance de cette image, et le Dockerfile décrit sa construction.

Les commandes essentielles permettent de construire une image (`docker build`), de lancer et gérer des conteneurs (`docker run`, `docker ps`, `docker stop`, `docker rm`) ainsi que de gérer les images (`docker images`, `docker rmi`). Les ports peuvent être exposés avec l'option `-p`.

Pour déployer sur Render depuis un Mac, l'image doit être construite pour la plateforme `linux/amd64`, puis publiée dans un registre. La séance a également abordé l'installation de Docker sur Debian, la récupération d'une image Docker Hub et l'installation de Portainer pour administrer les conteneurs.


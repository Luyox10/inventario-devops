pipeline {

    agent any

    stages {

        stage('Clonar repositorio') {
            steps {
                git 'https://github.com/Luyox10/inventario-devops.git'
            }
        }

        stage('Levantar Docker Compose') {
            steps {
                sh 'docker-compose up -d --build'
            }
        }

        stage('Verificar contenedores') {
            steps {
                sh 'docker ps'
            }
        }

    }

}
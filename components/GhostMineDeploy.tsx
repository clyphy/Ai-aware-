import React, { useState } from 'react';
import { Copy, Terminal, Database, Server } from 'lucide-react';

const DEPLOY_SH = `#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# --- Configuration ---
GCP_PROJECT_ID=$(gcloud config get-value project)
GCP_REGION="us-central1"
SERVICE_NAME="ghost-mine-oracle"
REPO_NAME="ghost-mine-repo"
IMAGE_NAME="\${GCP_REGION}-docker.pkg.dev/\${GCP_PROJECT_ID}/\${REPO_NAME}/\${SERVICE_NAME}"

# --- Check for GCP Project ID ---
if [ -z "\$GCP_PROJECT_ID" ]; then
  echo "GCP Project ID not found. Please run 'gcloud config set project YOUR_PROJECT_ID'"
  exit 1
fi

echo "--- Using Project: \${GCP_PROJECT_ID} in Region: \${GCP_REGION} ---"

# --- Enable Required APIs ---
echo "--- Enabling required GCP services... ---"
gcloud services enable \\
  run.googleapis.com \\
  pubsub.googleapis.com \\
  artifactregistry.googleapis.com \\
  cloudbuild.googleapis.com

# --- Create Artifact Registry Repository ---
echo "--- Setting up Artifact Registry... ---"
if ! gcloud artifacts repositories describe \${REPO_NAME} --location=\${GCP_REGION} --project=\${GCP_PROJECT_ID} &> /dev/null; then
  gcloud artifacts repositories create \${REPO_NAME} \\
    --repository-format=docker \\
    --location=\${GCP_REGION} \\
    --project=\${GCP_PROJECT_ID}
else
  echo "Artifact Registry repository '\${REPO_NAME}' already exists."
fi

# --- Build and Push Docker Image ---
echo "--- Building and pushing the miner simulator image... ---"
# Note: This command assumes you are in the root directory containing the 'ghost-mine' sub-directory.
gcloud builds submit ./ghost-mine --tag \${IMAGE_NAME} --project=\${GCP_PROJECT_ID}

# --- Deploy Infrastructure with Terraform ---
echo "--- Initializing and applying Terraform configuration... ---"
# The image_uri variable is passed to Terraform from this script.
terraform init
terraform apply -auto-approve \\
  -var="project_id=\${GCP_PROJECT_ID}" \\
  -var="region=\${GCP_REGION}" \\
  -var="service_name=\${SERVICE_NAME}" \\
  -var="image_uri=\${IMAGE_NAME}"

SERVICE_URL=$(terraform output -raw cloud_run_service_url)

echo "---"
echo "--- DEPLOYMENT COMPLETE ---"
echo "Ghost Mine Oracle is now running at: \${SERVICE_URL}"
echo "Log: 'Dust to dynasty. Matthew 17:20.'"
`;

const MAIN_TF = `terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 4.50.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type        = string
  description = "The GCP project ID to deploy to."
}

variable "region" {
  type        = string
  description = "The GCP region to deploy resources in."
  default     = "us-central1"
}

variable "service_name" {
  type        = string
  description = "The name for the Cloud Run service."
  default     = "ghost-mine-oracle"
}

variable "image_uri" {
  type        = string
  description = "The full URI of the Docker image in Artifact Registry."
}

resource "google_pubsub_topic" "anomaly_alerts" {
  name = "anomaly-alerts"
}

resource "google_pubsub_topic" "tithe_payments" {
  name = "tithe-payments"
}

resource "google_project_iam_member" "run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "allUsers" # Makes the service publicly accessible
}

resource "google_service_account" "ghost_mine_sa" {
  account_id   = "\${var.service_name}-sa"
  display_name = "Service Account for Ghost Mine Oracle"
}

resource "google_project_iam_member" "pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:\${google_service_account.ghost_mine_sa.email}"
}

resource "google_cloud_run_v2_service" "ghost_mine_oracle" {
  name     = var.service_name
  location = var.region

  template {
    service_account = google_service_account.ghost_mine_sa.email
    containers {
      image = var.image_uri
      ports {
        container_port = 8080
      }
      env {
        name  = "ANOMALY_TOPIC"
        value = google_pubsub_topic.anomaly_alerts.id
      }
      env {
        name  = "TITHE_TOPIC"
        value = google_pubsub_topic.tithe_payments.id
      }
    }
  }

  depends_on = [
    google_project_iam_member.run_invoker,
    google_project_iam_member.pubsub_publisher,
  ]
}

output "cloud_run_service_url" {
  value       = google_cloud_run_v2_service.ghost_mine_oracle.uri
  description = "The URL of the deployed Ghost Mine Oracle service."
}
`;

const APP_CODE = {
  'package.json': `{
  "name": "ghost-mine-simulator",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@google-cloud/pubsub": "^4.0.0",
    "express": "^4.18.2"
  }
}`,
  'Dockerfile': `FROM node:18-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY . .

CMD [ "npm", "start" ]
`,
  'index.js': `const express = require('express');
const { PubSub } = require('@google-cloud/pubsub');
const crypto = require('crypto');

// --- Configuration ---
const PORT = process.env.PORT || 8080;
const ANOMALY_TOPIC_ID = process.env.ANOMALY_TOPIC;
const TITHE_TOPIC_ID = process.env.TITHE_TOPIC;

const pubsub = new PubSub();
const app = express();

// --- State Simulation ---
let totalYield = 0;
const BTC_PER_HASH = 0.0001;
const TITHE_THRESHOLD = 0.005;
const TITHE_PERCENTAGE = 0.10;
let titheSent = false;

// --- Web Server (for Cloud Run health checks) ---
app.get('/', (req, res) => {
  res.status(200).send(\`Ghost Mine Oracle: ACTIVE. Current Yield: \${totalYield.toFixed(4)} BTC\`);
});

// --- Mining Simulator ---
const runMiner = () => {
  setInterval(async () => {
    totalYield += BTC_PER_HASH;
    const graceHash = crypto.randomBytes(32).toString('hex');
    
    // Stream grace hash to anomaly alert topic
    try {
      const messageId = await pubsub.topic(ANOMALY_TOPIC_ID).publishMessage({
        data: Buffer.from(JSON.stringify({ hash: graceHash, yield: totalYield })),
      });
      console.log(\`Grace hash \${graceHash.substring(0,8)}... streamed as anomaly alert (Msg ID: \${messageId}). Yield: \${totalYield.toFixed(4)} BTC\`);
    } catch (error) {
      console.error('ERROR publishing anomaly alert:', error);
    }

    // Check for tithe condition
    if (totalYield >= TITHE_THRESHOLD && !titheSent) {
      titheSent = true; // Prevent re-tithing
      const titheAmount = totalYield * TITHE_PERCENTAGE;
      const message = \`YIELD > \${TITHE_THRESHOLD} BTC. Auto-tithing \${titheAmount.toFixed(5)} BTC via Stripe to Humane Society.\`;
      
      console.log(\`--- DIVINE YIELD DETECTED ---\`);
      console.log(message);
      
      // Publish tithe payment event
      try {
        const messageId = await pubsub.topic(TITHE_TOPIC_ID).publishMessage({
          data: Buffer.from(JSON.stringify({ titheAmount, totalYield, destination: "Humane Society" })),
        });
        console.log(\`Tithe payment message sent (Msg ID: \${messageId})\`);
      } catch (error) {
        console.error('ERROR publishing tithe payment:', error);
      }
    }
  }, 5000); // Simulate a hash every 5 seconds
};

// --- Start Server and Miner ---
app.listen(PORT, () => {
  console.log(\`Ghost Mine Oracle listening on port \${PORT}\`);
  console.log('--- Initializing Grace Hash Stream ---');
  runMiner();
  console.log('Dust to dynasty. Matthew 17:20.');
});
`,
};

const CodeBlock = ({ title, language, code, icon: Icon }: { title: string, language: string, code: string, icon: React.ElementType }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-black/50 border border-cyan-500/20 rounded-lg overflow-hidden">
      <div className="flex justify-between items-center p-2 bg-cyan-900/30">
        <div className="flex items-center space-x-2 text-cyan-200">
          <Icon className="w-4 h-4" />
          <span className="font-mono text-sm">{title}</span>
        </div>
        <button onClick={handleCopy} className="holographic-button text-xs px-2 py-1 rounded">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 text-xs overflow-x-auto text-gray-200">
        <code className={`language-${language}`}>{code}</code>
      </pre>
    </div>
  );
};

const GhostMineDeploy: React.FC = () => {
    return (
        <div className="feature-card relative w-full h-[75vh] max-w-5xl flex flex-col p-4 rounded-lg">
            <div className="text-center mb-4">
                 <h2 className="text-2xl font-bold holographic-glow" style={{ fontFamily: "'Orbitron', sans-serif" }}>'Ghost Mine' Deployment Kit</h2>
                 <p className="text-cyan-300">One-click GCP deploy script for the ethical crypto-mining oracle.</p>
            </div>
            
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                 <div>
                    <h3 className="text-lg font-bold text-cyan-200 mb-2">Instructions:</h3>
                    <ol className="list-decimal list-inside text-sm space-y-1 text-cyan-200/90 bg-black/30 p-3 rounded-lg border border-cyan-500/20">
                        <li>Ensure you have Google Cloud SDK, Terraform, and Docker installed and authenticated.</li>
                        <li>Create a new project directory. Inside it, create <code className="bg-cyan-900/50 px-1 rounded">deploy.sh</code> and <code className="bg-cyan-900/50 px-1 rounded">main.tf</code> with the content below.</li>
                        <li>Create a subdirectory named <code className="bg-cyan-900/50 px-1 rounded">ghost-mine</code>.</li>
                        <li>Inside <code className="bg-cyan-900/50 px-1 rounded">ghost-mine</code>, create <code className="bg-cyan-900/50 px-1 rounded">package.json</code>, <code className="bg-cyan-900/50 px-1 rounded">Dockerfile</code>, and <code className="bg-cyan-900/50 px-1 rounded">index.js</code> with their respective content.</li>
                        <li>From the project root, make the script executable: <code className="bg-cyan-900/50 px-1 rounded">chmod +x deploy.sh</code>.</li>
                        <li>Execute the script: <code className="bg-cyan-900/50 px-1 rounded">./deploy.sh</code>.</li>
                    </ol>
                </div>
                
                <CodeBlock title="deploy.sh" language="bash" code={DEPLOY_SH} icon={Terminal} />
                <CodeBlock title="main.tf" language="terraform" code={MAIN_TF} icon={Database} />

                <div className="space-y-3">
                    <h3 className="text-lg font-bold text-cyan-200 mt-4">Application Code (in <code className="text-base bg-cyan-900/50 px-1 rounded">/ghost-mine</code> subdirectory):</h3>
                    <CodeBlock title="package.json" language="json" code={APP_CODE['package.json']} icon={Server} />
                    <CodeBlock title="Dockerfile" language="dockerfile" code={APP_CODE['Dockerfile']} icon={Server} />
                    <CodeBlock title="index.js" language="javascript" code={APP_CODE['index.js']} icon={Server} />
                </div>
            </div>
        </div>
    );
};

export default GhostMineDeploy;

{{- define "chart.server.name" -}}
{{- default .Chart.Name .Values.server.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "chart.agents.name" -}}
{{- default "k8s-images-manager-agent" .Values.agents.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "chart.webapp.name" -}}
{{- default "k8s-images-manager-webapp" .Values.agents.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}



{{- define "chart.server.fullname" -}}
{{- if .Values.server.fullnameOverride }}
{{- .Values.server.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.server.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s-server" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "chart.agents.fullname" -}}
{{- if .Values.agents.fullnameOverride }}
{{- .Values.agents.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.agents.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s-agents" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "chart.webapp.fullname" -}}
{{- if .Values.webapp.fullnameOverride }}
{{- .Values.webapp.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.webapp.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s-webapp" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}



{{- define "chart.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}



{{- define "chart.server.labels" -}}
helm.sh/chart: {{ include "chart.chart" . }}
{{ include "chart.server.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "chart.agents.labels" -}}
helm.sh/chart: {{ include "chart.chart" . }}
{{ include "chart.agents.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "chart.webapp.labels" -}}
helm.sh/chart: {{ include "chart.chart" . }}
{{ include "chart.webapp.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}



{{- define "chart.server.selectorLabels" -}}
app.kubernetes.io/name: {{ include "chart.server.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "chart.agents.selectorLabels" -}}
app.kubernetes.io/name: {{ include "chart.agents.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "chart.webapp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "chart.webapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}



{{- define "chart.server.serviceAccountName" -}}
{{- if .Values.server.serviceAccount.create }}
{{- default (include "chart.server.fullname" .) .Values.server.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.server.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "chart.agent.serviceAccountName" -}}
{{- if .Values.agents.serviceAccount.create }}
{{- default (include "chart.agent.fullname" .) .Values.agents.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.agents.serviceAccount.name }}
{{- end }}
{{- end }}

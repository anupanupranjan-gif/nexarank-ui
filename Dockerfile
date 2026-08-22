FROM nginx:alpine
ENV NGINX_ENVSUBST_FILTER=^(NEXARANK_API_URL)$
COPY build/ /usr/share/nginx/html/
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]

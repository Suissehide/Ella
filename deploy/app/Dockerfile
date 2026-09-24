FROM nginx:alpine
COPY deploy/app/nginx.conf /etc/nginx/conf.d/default.conf
COPY src/ /usr/share/nginx/html/
RUN rm -rf /usr/share/nginx/html/media

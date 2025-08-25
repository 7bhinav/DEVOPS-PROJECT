FROM nginx:alpine

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy site
COPY . /usr/share/nginx/html

EXPOSE 80

CMD ["/bin/sh","-c","nginx -g 'daemon off;' -c /etc/nginx/nginx.conf"]

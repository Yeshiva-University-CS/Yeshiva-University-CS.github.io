---
layout: page
title: Guest Lectures
permalink: /guest-lectures
---

# Guest Lectures
<br />
{% for v in site.data.guest-lectures['videos'] %}
### {{ v.title }}
#### {{ v.series }}
> {{v.date}}

<iframe class="mx-auto d-block" width="560" height="315" src="{{v.link}}" frameborder="0" title="{{v.title}}" allow="accelerometer; autoplay; encrypted-media;clipboard-write; picture-in-picture" allowfullscreen></iframe> {% endfor %}

---
layout: page
title: Orientation Videos
permalink: /orientation-2020
---

# Computer Science Orientation 2020
<br />
{% for v in site.data.orientation-2020['videos'] %}
### {{ v.title }}
> {{ v.description }}

<iframe class="mx-auto d-block" width="560" height="315" src="{{v.link}}" frameborder="0"
title="{{v.title}}" allow="accelerometer; autoplay; encrypted-media;clipboard-write; picture-in-picture" allowfullscreen></iframe>

{% endfor %}

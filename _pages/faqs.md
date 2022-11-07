---
layout: page
title: FAQs
share-title: YU Computer Science | FAQs
full-width: true
permalink: /faqs
---

* toc
{:toc}

## Questions

* toc
{:toc}

{% for q in site.data.faq['qs'] %}

<div id="{{ q.question | cgi_escape }}" markdown="1">

### {{q.question}}

{: .box-note}
{{q.answer}}
</div>
{% endfor %}

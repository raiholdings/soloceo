<div class="row" style="margin-top:12px">
  <div class="col-sm-12">
    <div class="panel panel-default">
      <div class="panel-heading"><strong>Nền tảng của bạn (SoloCEO PaaS)</strong></div>
      <div class="panel-body">
        <p>Trạng thái triển khai:
          <span class="label {if $status eq 'RUNNING'}label-success{elseif $status eq 'FAILED'}label-danger{else}label-info{/if}">
            {$statusLabel}
          </span>
        </p>
        {if $url}
          <p>Địa chỉ truy cập:
            <a href="{$url}" target="_blank" rel="noopener"><strong>{$url}</strong></a>
          </p>
          {if $status neq 'RUNNING'}
            <p class="text-muted">Hệ thống đang được cấp phát tự động (thường 2–5 phút). Trang sẽ sẵn sàng ngay khi trạng thái chuyển sang <em>Đang chạy</em>.</p>
          {/if}
        {else}
          <p class="text-muted">Đang khởi tạo hạ tầng… vui lòng tải lại sau ít phút.</p>
        {/if}
      </div>
    </div>
  </div>
</div>

<?php
function nhanhoa_getConfigArray() {
	$configarray = array(
		'ResellerID' => array('Type' => 'text', 'Size' => '32', 'Description' => 'Enter your Reseller ID here'),
		'Username'   => array('Type' => 'text', 'Size' => '32', 'Description' => 'Enter your API key'),
		'Password'   => array('Type' => 'password', 'Size' => '32', 'Description' => 'Enter your API password')
	);
	return $configarray;
}
function nhanhoa_AdminCustomButtonArray() {
   $buttonarray = array(
		"Resend Email Verify" => "resendverify",
		"Unlock 24h" => "unlock24h",
	);
	return $buttonarray;
}
function nhanhoa_GetNameservers($params) {
	global $CONFIG;
	$params['domainname'] = strtolower(trim($params['domainname']));
	$cmd = substr($params['domainname'], -3, 3) == '.vn' ? 'get_infodomainvn' : 'get_infodomain';
	$postfields['auth-user'] = $params['Username'];
	$postfields['auth-pwd'] = $params['Password'];
	$postfields['auth-id'] = $params['ResellerID'];
	$formdata = array('domainName' => $params['domainname']);
	$result = execute($cmd, $postfields, $formdata);
	$result = json_decode($result, true);
	if ($result['status'] == 'ok') {
		$domain_content = $result['content'];
		if (substr($params['domainname'], -3, 3) == '.vn') {
			$data['ns1'] = $domain_content['subDomainName1'];
			$data['ns2'] = $domain_content['subDomainName2'];
			$data['ns3'] = $domain_content['subDomainName3'];
			$data['ns4'] = $domain_content['subDomainName4'];
		} else {
			$data['ns1'] = $domain_content['dns_inter'];
			$data['ns2'] = $domain_content['dns_inter2'];
			$data['ns3'] = $domain_content['dns_inter3'];
			$data['ns4'] = $domain_content['dns_inter4'];
		}
	} else {
		$i = 1;
		while ($i <= 5) {
			$data['ns' . $i] = trim($CONFIG['DefaultNameserver' . $i]);
			++$i;
		}
	}
	return $data;
}
function nhanhoa_GetRegistrarLock($params)
{
	if (substr($params['domainname'], -3, 3) == '.vn') {
		return array("error" => "Tính năng này chỉ mới hỗ trợ TMQT");
	}
	
	$cmd = 'domain_tf_status';
	
	$postfields['auth-user'] = $params['Username'];
	$postfields['auth-pwd'] = $params['Password'];
	$postfields['auth-id'] = $params['ResellerID'];
	
	$formdata = array(
		'is_whmcs' => '1',
		'domainName' => $params['domainname']
	);
	$result = execute($cmd, $postfields, $formdata);
	$result = json_decode($result, true);
	if ($result['status'] == 'error') {
		return array("error" => $result["msg"]);
	}
	$lockstatus = $result['lockstatus'];
	return $lockstatus;
}
function nhanhoa_SaveRegistrarLock($params)
{
	if (substr($params['domainname'], -3, 3) == '.vn') {
		return array("error" => "Tính năng này chỉ mới hỗ trợ TMQT");
	}
	if ($params["lockenabled"] == "locked") {
		$cmd = 'domain_lock';
	} else {
		$cmd = 'domain_unlock';
	}
	
	$postfields['auth-user'] = $params['Username'];
	$postfields['auth-pwd'] = $params['Password'];
	$postfields['auth-id'] = $params['ResellerID'];
	
	$formdata = array(
		'is_whmcs' => '1',
		'domainName' => $params['domainname']
	);
	$result = execute($cmd, $postfields, $formdata);
	$result = json_decode($result, true);
	if ($result['status'] == 'error') {
		return array("error" => $result["msg"]);
	}
	return array("success" => true);
}
function nhanhoa_RegisterDomain($params) {
	$postfields['auth-user'] = $params['Username'];
	$postfields['auth-pwd'] = $params['Password'];
	$postfields['auth-id'] = $params['ResellerID'];
	if ($params['countryname'] == 'Viet Nam') {
		$params['countryname'] = 'Vietnam';
	}
	$formdata = array(
		'is_whmcs' => '1',
		'domainNameList' => $params['domainname'],
		'domainName' => $params['sld'],
		'domainExt' => $params['tld'],
		'domainYear' => $params['regperiod'],
		'domainDNS1' => $params['ns1'],
		'domainIP1' => gethostbyname($params['ns1']),
		'domainDNS2' => $params['ns2'],
		'domainIP2' => gethostbyname($params['ns2']),
		'domainDNS3' => $params['ns3'],
		'domainIP3' => gethostbyname($params['ns3']),
		'domainDNS4' => $params['ns4'],
		'domainIP4' => gethostbyname($params['ns4']),
		'domain_realname' => $params['original']['additionalfields']['owner_name'] ? $params['original']['additionalfields']['owner_name'] : $params['fullname'],
		'domain_address' => $params['original']['additionalfields']['owner_address'] ? $params['original']['additionalfields']['owner_address'] : $params['address1'] . ' ' . $params['address2'],
		'domain_phone' => $params['original']['additionalfields']['owner_phone'] ? $params['original']['additionalfields']['owner_phone'] : $params['phonenumber'],
		'domain_username' => $params['email'],
		'domain_email' => $params['email'],
		'domain_company' => $params['original']['additionalfields']['congty_ten'] ? $params['original']['additionalfields']['congty_ten'] : $params['companyname'],
		'domain_city' => $params['original']['additionalfields']['owner_city'] ? $params['original']['additionalfields']['owner_city'] : $params['fullstate'],
		'domain_country' => $params['original']['additionalfields']['owner_country'] ? $params['original']['additionalfields']['owner_country'] : $params['countryname'],
		'ord_owner_type' => $params['original']['additionalfields']['owner_type'],
		'owner_type' => $params['original']['additionalfields']['owner_type'],
		'congty_ten' => $params['original']['additionalfields']['congty_ten'],
		'congty_mst' => $params['original']['additionalfields']['congty_mst'],
		'congty_diachi' => $params['original']['additionalfields']['congty_diachi'],
		'congty_dt' => $params['original']['additionalfields']['congty_dt'],
		'ownerName' => $params['original']['additionalfields']['owner_name'],
		'ownerAddress' => $params['original']['additionalfields']['owner_address'],
		'ownerCity' => $params['original']['additionalfields']['owner_city'],
		'ownerCountry' => $params['original']['additionalfields']['owner_country'],
		'ownerPhone' => $params['original']['additionalfields']['owner_phone'] ? $params['original']['additionalfields']['owner_phone'] : $params['phonenumber'],
		'ownerMail' => $params['email'],
		'ownerEmail' => $params['email'],
		'ownerPersonID' => $params['original']['additionalfields']['owner_person_id'],
		'ownerBirthday' => $params['original']['additionalfields']['owner_birthday'],
		'ownerGender' => $params['original']['additionalfields']['owner_gender'],
	);
	$formdata['techName'] = $formdata['billingName'] = $formdata['ownerName'];
	$formdata['techAddress'] = $formdata['billingAddress'] = $formdata['ownerAddress'];
	$formdata['techPhone'] = $formdata['billingPhone'] = $formdata['ownerPhone'];
	$formdata['techMail'] = $formdata['billingMail'] =  $formdata['ownerMail'];
	$formdata['techEmail'] = $formdata['billingEmail'] = $formdata['ownerMail'];
	$formdata['techCity'] = $formdata['billingCity'] = $formdata['ownerCity'];
	$formdata['techCountry'] = $formdata['billingCountry'] = $formdata['ownerCountry'];
	$formdata['techPersonID'] = $formdata['billingPersonID'] = $formdata['ownerPersonID'];
	$formdata['techBirthday'] = $formdata['billingBirthday'] = $formdata['ownerBirthday'];
	$formdata['techGender'] = $formdata['billingGender'] = $formdata['ownerGender'];
	if ($params['original']['additionalfields']['owner_type'] == 1) {
		$formdata['ownerName'] = $params['original']['additionalfields']['congty_ten'];
		$formdata['ownerPhone'] = $params['original']['additionalfields']['congty_dt'];
		$formdata['ownerAddress'] = $params['original']['additionalfields']['congty_diachi'];
	}
	$formdata['idprotection'] = $params["idprotection"];
	$check = check_input($formdata);
	if (substr($params['domainname'], -3, 3) != '.vn') {
		$check['status'] = 'success';
	}
	if ($check['status'] == 'success') {
		if (substr($params['domainname'], -3, 3) == '.vn') {
			$cmd = 'register_domainvn';
		} else {
			$cmd = 'register_domain';
		}
		$result = execute($cmd, $postfields, $formdata);
		$result = json_decode($result);
		if (strtolower($result->status) == 'ok') {
			$sqlupdate = update_query('tbldomains', array('status' => 'Active', 'additionalnotes' => $result->msg), array('domain' => $params['domainname']));
			return array('success' => $result->msg);
		}
		else {
			$sqlupdate = update_query('tbldomains', array('status' => 'Pending', 'additionalnotes' => $result->msg), array('domain' => $params['domainname']));
			return array('error' => $result->msg);
		}
	} else {
		$sqlupdate = update_query('tbldomains', array('status' => 'Pending', 'additionalnotes' => $check['msg']), array('domain' => $params['domainname']));
		return array('error' => $check['msg']);
	}
}
function nhanhoa_TransferDomain($params) {
	$postfields['auth-user'] = $params['Username'];
	$postfields['auth-pwd'] = $params['Password'];
	$postfields['auth-id'] = $params['ResellerID'];
	if ($params['countryname'] == 'Viet Nam') {
		$params['countryname'] = 'Vietnam';
	}
	$formdata = array(
		'is_whmcs' => '1',
		'domainNameList' => $params['domainname'],
		'domainName' => $params['sld'],
		'domainExt' => $params['tld'],
		'domainYear' => $params['regperiod'],
		'domainDNS1' => $params['ns1'],
		'domainIP1' => gethostbyname($params['ns1']),
		'domainDNS2' => $params['ns2'],
		'domainIP2' => gethostbyname($params['ns2']),
		'domainDNS3' => $params['ns3'],
		'domainIP3' => gethostbyname($params['ns3']),
		'domainDNS4' => $params['ns4'],
		'domainIP4' => gethostbyname($params['ns4']),
		'auth-code' => $params["transfersecret"],
		'domain_realname' => $params['original']['additionalfields']['owner_name'] ? $params['original']['additionalfields']['owner_name'] : $params['fullname'],
		'domain_address' => $params['original']['additionalfields']['owner_address'] ? $params['original']['additionalfields']['owner_address'] : $params['address1'] . ' ' . $params['address2'],
		'domain_phone' => $params['original']['additionalfields']['owner_phone'] ? $params['original']['additionalfields']['owner_phone'] : $params['phonenumber'],
		'domain_username' => $params['email'],
		'domain_email' => $params['email'],
		'domain_company' => $params['original']['additionalfields']['congty_ten'] ? $params['original']['additionalfields']['congty_ten'] : $params['companyname'],
		'domain_city' => $params['original']['additionalfields']['owner_city'] ? $params['original']['additionalfields']['owner_city'] : $params['fullstate'],
		'domain_country' => $params['original']['additionalfields']['owner_country'] ? $params['original']['additionalfields']['owner_country'] : $params['countryname'],
		'ord_owner_type' => $params['original']['additionalfields']['owner_type'],
		'owner_type' => $params['original']['additionalfields']['owner_type'],
		'congty_ten' => $params['original']['additionalfields']['congty_ten'],
		'congty_mst' => $params['original']['additionalfields']['congty_mst'],
		'congty_diachi' => $params['original']['additionalfields']['congty_diachi'],
		'congty_dt' => $params['original']['additionalfields']['congty_dt'],
		'ownerName' => $params['original']['additionalfields']['owner_name'],
		'ownerAddress' => $params['original']['additionalfields']['owner_address'],
		'ownerCity' => $params['original']['additionalfields']['owner_city'],
		'ownerCountry' => $params['original']['additionalfields']['owner_country'],
		'ownerPhone' => $params['original']['additionalfields']['owner_phone'] ? $params['original']['additionalfields']['owner_phone'] : $params['phonenumber'],
		'ownerMail' => $params['email'],
		'ownerEmail' => $params['email'],
		'ownerPersonID' => $params['original']['additionalfields']['owner_person_id'],
		'ownerBirthday' => $params['original']['additionalfields']['owner_birthday'],
		'ownerGender' => $params['original']['additionalfields']['owner_gender'],
	);
	$formdata['techName'] = $formdata['billingName'] = $formdata['ownerName'];
	$formdata['techAddress'] = $formdata['billingAddress'] = $formdata['ownerAddress'];
	$formdata['techPhone'] = $formdata['billingPhone'] = $formdata['ownerPhone'];
	$formdata['techMail'] = $formdata['billingMail'] =  $formdata['ownerMail'];
	$formdata['techEmail'] = $formdata['billingEmail'] = $formdata['ownerMail'];
	$formdata['techCity'] = $formdata['billingCity'] = $formdata['ownerCity'];
	$formdata['techCountry'] = $formdata['billingCountry'] = $formdata['ownerCountry'];
	$formdata['techPersonID'] = $formdata['billingPersonID'] = $formdata['ownerPersonID'];
	$formdata['techBirthday'] = $formdata['billingBirthday'] = $formdata['ownerBirthday'];
	$formdata['techGender'] = $formdata['billingGender'] = $formdata['ownerGender'];
	if ($params['original']['additionalfields']['owner_type'] == 1) {
		$formdata['ownerName'] = $params['original']['additionalfields']['congty_ten'];
		$formdata['ownerPhone'] = $params['original']['additionalfields']['congty_dt'];
		$formdata['ownerAddress'] = $params['original']['additionalfields']['congty_diachi'];
	}
	$formdata['idprotection'] = $params["idprotection"];
	$check = check_input($formdata);
	if ($check['status'] == 'success') {
		if (substr($params['domainname'], -3, 3) == '.vn') {
			$cmd = 'transfer_domainvn';
		} else {
			$cmd = 'transfer_domain';
		}
		$result = execute($cmd, $postfields, $formdata);
		$result = json_decode($result);
		if (strtolower($result->status) == 'ok') {
			$sqlupdate = update_query('tbldomains', array('status' => 'Active', 'additionalnotes' => $result->msg), array('domain' => $params['domainname']));
			return array('success' => $result->msg);
		}
		else {
			$sqlupdate = update_query('tbldomains', array('status' => 'Pending', 'additionalnotes' => $result->msg), array('domain' => $params['domainname']));
			return array('error' => $result->msg);
		}
	} else {
		$sqlupdate = update_query('tbldomains', array('status' => 'Pending', 'additionalnotes' => $check['msg']), array('domain' => $params['domainname']));
		return array('error' => $check['msg']);
	}
}
function nhanhoa_RenewDomain($params) {
	if (substr($params['domainname'], -3) == '.vn') {
		$cmd = 'renew_domainvn';
	} else {
		$cmd = 'renew_domain';
	}
	$postfields['auth-user'] = $params['Username'];
	$postfields['auth-pwd'] = $params['Password'];
	$postfields['auth-id'] = $params['ResellerID'];
	$formdata = array('is_whmcs' => '1', 'ord_owner_type' => $ord_owner_type, 'domainNameList' => $params['domainname'], 'domainName' => $params['sld'], 'domainExt' => $params['tld'], 'domainYear' => $params['regperiod'], 'domainDNS1' => $params['ns1'], 'domainIP1' => gethostbyname($params['ns1']), 'domainDNS2' => $params['ns2'], 'domainIP2' => gethostbyname($params['ns2']), 'domainDNS3' => $params['ns3'], 'domainIP3' => gethostbyname($params['ns3']), 'domainDNS4' => $params['ns4'], 'domainIP4' => gethostbyname($params['ns4']), 'ownerName' => $params['original']['additionalfields']['owner_name'], 'ownerAddress' => $params['original']['additionalfields']['owner_address'], 'ownerPhone' => $params['original']['additionalfields']['owner_phone'], 'ownerFax' => '', 'ownerMail' => $params['original']['additionalfields']['owner_address'], 'ownerCity' => $params['original']['additionalfields']['owner_city'], 'ownerCountry' => $params['original']['additionalfields']['owner_country'], 'ownerEmail' => $params['original']['additionalfields']['owner_email'], 'ownerPersonID' => $ord_owner_type == 0 ? $params['original']['additionalfields']['owner_person_id'] : '', 'ownerBirthday' => $ord_owner_type == 0 ? $params['original']['additionalfields']['owner_birthday'] : '', 'ownerGender' => $ord_owner_type == 0 ? $params['original']['additionalfields']['owner_gender'] : '', 'techName' => $params['original']['additionalfields']['tech_name'], 'techGender' => $params['original']['additionalfields']['tech_gender'], 'techPosition' => $params['original']['additionalfields']['tech_position'], 'techAddress' => $params['original']['additionalfields']['tech_address'], 'techPhone' => $params['original']['additionalfields']['tech_phone'], 'techPersonID' => $params['original']['additionalfields']['tech_person_id'], 'techBirthday' => $params['original']['additionalfields']['tech_birthday'], 'techEmail' => $params['original']['additionalfields']['tech_email'], 'techCity' => $params['original']['additionalfields']['tech_city'], 'techCountry' => $params['original']['additionalfields']['tech_country'], 'billingName' => $params['original']['additionalfields']['billing_name'], 'billingAddress' => $params['original']['additionalfields']['billing_address'], 'billingPhone' => $params['original']['additionalfields']['billing_phone'], 'billingEmail' => $params['original']['additionalfields']['billing_email'], 'billingCity' => $params['original']['additionalfields']['billing_city'], 'billingCountry' => $params['original']['additionalfields']['billing_country']);
	$result = execute($cmd, $postfields, $formdata);
	$result = json_decode($result);
	if (strtolower($result->status) == 'ok') {
		$sqlupdate = update_query('tbldomains', array('status' => 'Active', 'additionalnotes' => $result->msg), array('domain' => $params['domainname']));
		return array('success' => $result->msg);
	} else {
		$sqlupdate = update_query('tbldomains', array('status' => 'Pending', 'additionalnotes' => $result->msg), array('domain' => $params['domainname']));
		return array('error' => $result->msg);
	}
}
function nhanhoa_SaveNameservers($params) {
	if (substr($params['domainname'], -3, 3) == '.vn') {
		$cmd = 'change_dnsdomainvn';
	} else {
		$cmd = 'change_dnsdomain';
	}
	$postfields['auth-user'] = $params['Username'];
	$postfields['auth-pwd'] = $params['Password'];
	$postfields['auth-id'] = $params['ResellerID'];
	$formdata = array('is_whmcs' => '1', 'ord_owner_type' => $ord_owner_type, 'domainNameList' => $params['domainname'], 'domainName' => $params['sld'], 'domainExt' => $params['tld'], 'domainYear' => $params['regperiod'], 'domainDNS1' => $params['ns1'], 'domainIP1' => gethostbyname($params['ns1']), 'domainDNS2' => $params['ns2'], 'domainIP2' => gethostbyname($params['ns2']), 'domainDNS3' => $params['ns3'], 'domainIP3' => gethostbyname($params['ns3']), 'domainDNS4' => $params['ns4'], 'domainIP4' => gethostbyname($params['ns4']), 'ownerName' => $params['original']['additionalfields']['owner_name'], 'ownerAddress' => $params['original']['additionalfields']['owner_address'], 'ownerPhone' => $params['original']['additionalfields']['owner_phone'], 'ownerFax' => '', 'ownerMail' => $params['original']['additionalfields']['owner_address'], 'ownerCity' => $params['original']['additionalfields']['owner_city'], 'ownerCountry' => $params['original']['additionalfields']['owner_country'], 'ownerEmail' => $params['original']['additionalfields']['owner_email'], 'ownerPersonID' => $ord_owner_type == 0 ? $params['original']['additionalfields']['owner_person_id'] : '', 'ownerBirthday' => $ord_owner_type == 0 ? $params['original']['additionalfields']['owner_birthday'] : '', 'ownerGender' => $ord_owner_type == 0 ? $params['original']['additionalfields']['owner_gender'] : '', 'techName' => $params['original']['additionalfields']['tech_name'], 'techGender' => $params['original']['additionalfields']['tech_gender'], 'techPosition' => $params['original']['additionalfields']['tech_position'], 'techAddress' => $params['original']['additionalfields']['tech_address'], 'techPhone' => $params['original']['additionalfields']['tech_phone'], 'techPersonID' => $params['original']['additionalfields']['tech_person_id'], 'techBirthday' => $params['original']['additionalfields']['tech_birthday'], 'techEmail' => $params['original']['additionalfields']['tech_email'], 'techCity' => $params['original']['additionalfields']['tech_city'], 'techCountry' => $params['original']['additionalfields']['tech_country'], 'billingName' => $params['original']['additionalfields']['billing_name'], 'billingAddress' => $params['original']['additionalfields']['billing_address'], 'billingPhone' => $params['original']['additionalfields']['billing_phone'], 'billingEmail' => $params['original']['additionalfields']['billing_email'], 'billingCity' => $params['original']['additionalfields']['billing_city'], 'billingCountry' => $params['original']['additionalfields']['billing_country']);
	$result = execute($cmd, $postfields, $formdata);
	$result = json_decode($result);
	if (strtolower($result->status) == 'ok') {
		return array('success' => $result->msg);
	} else {
		return array('error' => $result->msg);
	}
}
function nhanhoa_GetContactDetails($params) {
	if (substr($params['domainname'], -3, 3) == '.vn') {
		$cmd = 'get_infodomainvn';
	} else {
		$cmd = 'get_infodomain';
	}
	$postfields['auth-user'] = $params['Username'];
	$postfields['auth-pwd'] = $params['Password'];
	$postfields['auth-id'] = $params['ResellerID'];
	$formdata = array(
		'is_whmcs' => '1',
		'domainName' => $params['domainname']
	);
	$result = execute($cmd, $postfields, $formdata);
	$result = json_decode($result, true);
	if ($result['status'] == 'error') {
		return array("error" => $result["msg"]);
	}
	$result = $result['content'];
	$contact = array();
	if (substr($params['domainname'], -3, 3) == '.vn') {
		if ($result['ord_owner_type'] == 1) {
			$contact['registrantcontactid'] = array(
				"Company Name" =>  $result['newDomain.ownerName'],
				"Tax ID" => $result['newDomain.ownerTax'],
				"Email" => $result['newDomain.ownerMail'],
				"Phone" => $result['newDomain.ownerPhone'],
				"Address" => $result['newDomain.ownerAddress'],
				"City" => $result['ownerProvinceList']
			);
		} else {
			$contact['registrantcontactid'] = array(
				"Full Name" => $result['newDomain.ownerName'],
				"Birthday" => $result['newDomain.ownerbirthDate'],
				"National ID" => $result['newDomain.ownerIDPP'],
				"Gender" => $result['newDomain.ownerGender'],
				"Email" => $result['newDomain.ownerMail'],
				"Phone" => $result['newDomain.ownerPhone'],
				"Address" => $result['newDomain.ownerAddress'],
				"City" => $result['ownerProvinceList']
			);
		}
		$contact['admincontactid'] = array(
			"Full Name" => $result['newDomain.adminName'],
			"Birthday" => $result['newDomain.adminbirthDate'],
			"National ID" => $result['newDomain.adminIDPP'],
			"Gender" => $result['newDomain.adminGender'],
			"Email" => $result['newDomain.adminEmail'],
			"Phone" => $result['newDomain.adminPhone'],
			"Address" => $result['newDomain.adminAddress'],
			"City" => $result['adminProvinceList']
		);
	} else {
		$contact['registrantcontactid'] = array(
			"Full Name" => $result['domain_realname'],
			"Company Name" => $result['domain_company'],
			"Email" => $result['domain_email'],
			"Phone" => $result['domain_phone'],
			"Address" => $result['domain_address'],
			"City" => $result['domain_city']
		);
	}
	return $contact;
}
function nhanhoa_SaveContactDetails($params) {
	if (substr($params['domainname'], -3, 3) == '.vn') {
		$cmd = 'change_infodomainvn';
	} else {
		$cmd = 'change_infodomain';
	}
	$postfields['auth-user'] = $params['Username'];
	$postfields['auth-pwd'] = $params['Password'];
	$postfields['auth-id'] = $params['ResellerID'];
	if ($params['countryname'] == 'Viet Nam') {
		$params['countryname'] = 'Vietnam';
	}
	$owner_contact = $_POST['contactdetails']['registrantcontactid'];
	$admin_contact = $_POST['contactdetails']['admincontactid'];
	$params['original']['additionalfields']['owner_name'] = $params['original']['additionalfields']['owner_name'] ? $params['original']['additionalfields']['owner_name'] : $params['fullname'];
	$params['original']['additionalfields']['owner_address'] = $params['original']['additionalfields']['owner_address'] ? $params['original']['additionalfields']['owner_address'] : $params['address1'] . ' ' . $params['address2'];
	$params['original']['additionalfields']['owner_phone'] = $params['original']['additionalfields']['owner_phone'] ? $params['original']['additionalfields']['owner_phone'] : $params['phonenumber'];
	$params['original']['additionalfields']['congty_ten'] = $params['original']['additionalfields']['congty_ten'] ? $params['original']['additionalfields']['congty_ten'] : $params['companyname'];
	$params['original']['additionalfields']['owner_city'] = $params['original']['additionalfields']['owner_city'] ? $params['original']['additionalfields']['owner_city'] : $params['fullstate'];
	if ($params['original']['additionalfields']['owner_type'] == 1) {
		$formdata['ownerName'] = $params['original']['additionalfields']['congty_ten'];
	}
	$formdata = array(
		'is_whmcs' => '1',
		'domainNameList' => $params['domainname'],
		'domainName' => $params['sld'],
		'domainExt' => $params['tld'],
		'domainYear' => $params['regperiod'],
		'domainDNS1' => $params['ns1'],
		'domainIP1' => gethostbyname($params['ns1']),
		'domainDNS2' => $params['ns2'],
		'domainIP2' => gethostbyname($params['ns2']),
		'domainDNS3' => $params['ns3'],
		'domainIP3' => gethostbyname($params['ns3']),
		'domainDNS4' => $params['ns4'],
		'domainIP4' => gethostbyname($params['ns4']),
		'domain_realname' => $owner_contact['Full Name'] ? $owner_contact['Full Name'] : $params['original']['additionalfields']['owner_name'],
		'domain_address' => $owner_contact['Address'] ? $owner_contact['Address'] : $params['original']['additionalfields']['owner_address'],
		'domain_phone' => $owner_contact['Phone'] ? $owner_contact['Phone'] : $params['original']['additionalfields']['owner_phone'],
		'domain_username' => $params['email'],
		'domain_email' => $owner_contact['Email'] ? $owner_contact['Email'] : $params['email'],
		'domain_company' => $owner_contact['Company Name'] ? $owner_contact['Company Name'] : $params['original']['additionalfields']['congty_ten'],
		'domain_city' => $owner_contact['City'] ? $owner_contact['City'] : $params['original']['additionalfields']['owner_city'],
		'domain_country' => $params['original']['additionalfields']['owner_country'] ? $params['original']['additionalfields']['owner_country'] : $params['countryname'],
		'ownerName' => $owner_contact['Full Name'] ? $owner_contact['Full Name'] : $params['original']['additionalfields']['owner_name'],
		'ownerCountry' => $params['original']['additionalfields']['owner_country'] ? $params['original']['additionalfields']['owner_country'] : $params['countryname'],
		'ownerCity' => $owner_contact['City'] ? $owner_contact['City'] : $params['original']['additionalfields']['owner_city'],
		'ownerDistrict' => $params['city'],
		'ownerAddress' => $owner_contact['Address'] ? $owner_contact['Address'] : $params['original']['additionalfields']['owner_address'],
		'ownerPhone' => $owner_contact['Phone'] ? $owner_contact['Phone'] : $params['original']['additionalfields']['owner_phone'],
		'ownerEmail' => $owner_contact['Email'] ? $owner_contact['Email'] : $params['email'],
		'ownerPersonID' => $owner_contact['National ID'] ? $owner_contact['National ID'] : $params['original']['additionalfields']['owner_person_id'],
		'ownerBirthday' => $owner_contact['Birthday'] ? $owner_contact['Birthday'] : $params['original']['additionalfields']['owner_birthday'],
		'ownerGender' => $owner_contact['Gender'] ? $owner_contact['Gender'] : $params['original']['additionalfields']['owner_gender'],
		'adminName' => $admin_contact['Full Name'] ? $admin_contact['Full Name'] : $params['original']['additionalfields']['owner_name'],
		'adminCountry' => $params['original']['additionalfields']['owner_country'] ? $params['original']['additionalfields']['owner_country'] : $params['countryname'],
		'adminCity' => $admin_contact['City'] ? $admin_contact['City'] : $params['original']['additionalfields']['owner_city'],
		'adminDistrict' => $params['city'],
		'adminAddress' => $admin_contact['Address'] ? $admin_contact['Address'] : $params['original']['additionalfields']['owner_address'],
		'adminPhone' => $admin_contact['Phone'] ? $admin_contact['Phone'] : $params['original']['additionalfields']['owner_phone'],
		'adminEmail' => $admin_contact['Email'] ? $admin_contact['Email'] : $params['email'],
		'adminPersonID' => $admin_contact['National ID'] ? $admin_contact['National ID'] : $params['original']['additionalfields']['owner_person_id'],
		'adminBirthday' => $admin_contact['Birthday'] ? $admin_contact['Birthday'] : $params['original']['additionalfields']['owner_birthday'],
		'adminGender' => $admin_contact['Gender'] ? $admin_contact['Gender'] : $params['original']['additionalfields']['owner_gender'],
	);
	$formdata['techName'] = $formdata['billingName'] = $formdata['adminName'];
	$formdata['techPhone'] = $formdata['billingPhone'] = $formdata['adminPhone'];
	$formdata['techEmail'] = $formdata['billingEmail'] = $formdata['adminEmail'];
	$formdata['techCountry'] = $formdata['billingCountry'] = $formdata['adminCountry'];
	$formdata['techCity'] = $formdata['billingCity'] = $formdata['adminCity'];
	$formdata['techDistrict'] = $formdata['billingDistrict'] = $formdata['adminDistrict'];
	$formdata['techAddress'] = $formdata['billingAddress'] = $formdata['adminAddress'];
	$formdata['techPersonID'] = $formdata['billingPersonID'] = $formdata['adminPersonID'];
	$formdata['techBirthday'] = $formdata['billingBirthday'] = $formdata['adminBirthday'];
	$formdata['techGender'] = $formdata['billingGender'] = $formdata['adminGender'];
	
	$result = execute($cmd, $postfields, $formdata);
	$result = json_decode($result);
	if (strtolower($result->status) == 'ok') {
		return array('success' => $result->msg);
	} else {
		return array('error' => $result->msg);
	}
}
function nhanhoa_IDProtectToggle($params) {
    if (substr($params['domainname'], -3, 3) == '.vn') {
		return array("error" => "Tính năng này chưa hỗ trợ TMVN");
	}
	
	$cmd = 'whois_protect';
	
	$postfields['auth-user'] = $params['Username'];
	$postfields['auth-pwd'] = $params['Password'];
	$postfields['auth-id'] = $params['ResellerID'];
	
	$idprotect = $params["protectenable"] ? '1' : '0';
	
	$formdata = array(
		'is_whmcs' => '1',
		'domainName' => $params['domainname'],
		'protect' => $idprotect,
	);
	$result = execute($cmd, $postfields, $formdata);
	$result = json_decode($result, true);
	if ($result['status'] == 'error') {
		return array("error" => $result["msg"]);
	}
	if ($params["protectenable"]) {
		return array('success' => 'Đã BẬT whois protect');
	} else {
		return array('success' => 'Đã TẮT whois protect');
	}
    update_query("tbldomains", array("idprotection" => $idprotect), array("id" => $params["domainid"]));
}
function nhanhoa_resendverify($params) {
    if (substr($params['domainname'], -3, 3) == '.vn') {
		return array("error" => "Tính năng này chưa hỗ trợ TMVN");
	}
	
	$cmd = 'resend_verify_domain';
	
	$postfields['auth-user'] = $params['Username'];
	$postfields['auth-pwd'] = $params['Password'];
	$postfields['auth-id'] = $params['ResellerID'];
	
	$formdata = array(
		'is_whmcs' => '1',
		'domainName' => $params['domainname']
	);
	$result = execute($cmd, $postfields, $formdata);
	$result = json_decode($result, true);
	if ($result['status'] == 'error') {
		return array("error" => $result["msg"]);
	} else {
		return array('success' => "Đã gửi email xác nhận cho tên miền {$params['domainname']}");
	}
}
function nhanhoa_unlock24h($params) {
    if (substr($params['domainname'], -3, 3) != '.vn') {
		return array("error" => "Tính năng này chỉ hỗ trợ TMVN");
	}
	
	$cmd = 'unlock24h';
	
	$postfields['auth-user'] = $params['Username'];
	$postfields['auth-pwd'] = $params['Password'];
	$postfields['auth-id'] = $params['ResellerID'];
	
	$formdata = array(
		'is_whmcs' => '1',
		'domainName' => $params['domainname']
	);
	$result = execute($cmd, $postfields, $formdata);
	$result = json_decode($result, true);
	if ($result['status'] == 'error') {
		return array("error" => $result["msg"]);
	} else {
		return array('success' => "Đã gửi yêu cầu mở tạm 24h cho tên miền {$params['domainname']}");
	}
}
function nhanhoa_GetEPPCode($params)
{
	if (substr($params['domainname'], -3, 3) == '.vn') {
		return array("error" => "Tính năng này chỉ mới hỗ trợ TMQT");
	}
	
	$cmd = 'domain_authcode';
	
	$postfields['auth-user'] = $params['Username'];
	$postfields['auth-pwd'] = $params['Password'];
	$postfields['auth-id'] = $params['ResellerID'];
	
	$formdata = array(
		'is_whmcs' => '1',
		'domainName' => $params['domainname']
	);
	$result = execute($cmd, $postfields, $formdata);
	$result = json_decode($result, true);
	if ($result['status'] == 'error') {
		return array("error" => $result["msg"]);
	}
	$values["eppcode"] = $result['authcode'];
	return $values;
}
function nhanhoa_Sync($params) {
	$params['domain'] = strtolower($params['domain']);
	$params['tld'] = strtolower($params['tld']);
	$domain_2 = $params['domain'];
	if (substr($params['domain'], -3, 3) != substr($params['tld'], -3, 3)) {
		$domain_2 .= $params['tld'];
	}
	$params['domainname'] = $params['domainname'] ? $params['domainname'] : $domain_2;
	$params['domainname'] = strtolower(trim($params['domainname']));
	$cmd = 'domain_sync';
	$postfields['auth-user'] = $params['Username'];
	$postfields['auth-pwd'] = $params['Password'];
	$postfields['auth-id'] = $params['ResellerID'];
	$formdata = array(
		'is_whmcs' => '1',
		'domainName' => $params['domainname']
	);
	$result = execute($cmd, $postfields, $formdata);
	$result = json_decode($result, true);
    if (strtoupper($result["status"]) == "ERROR") {
        if (!$result["message"]) {
            $result["message"] = $result["msg"];
        }
        return array("error" => $result["message"]);
    }
    $expirytime = $currentstatus = "";
    $expirytime = $result["endtime"];
    $currentstatus = $result["currentstatus"];
    if ($expirytime) {
        $returndata = array();
        if ($currentstatus == "Active") {
            $returndata["active"] = true;
        } else {
            if ($currentstatus == "Expired") {
                $returndata["expired"] = true;
            }
        }
        $returndata["expirydate"] = date("Y-m-d", $expirytime);
        return $returndata;
    }
    return array("error" => "No expiry date returned");
}
function nhanhoa_TransferSync($params) {
	$params['domain'] = strtolower($params['domain']);
	$params['tld'] = strtolower($params['tld']);
	$domain_2 = $params['domain'];
	if (substr($params['domain'], -3, 3) != substr($params['tld'], -3, 3)) {
		$domain_2 .= $params['tld'];
	} 
	$params['domainname'] = $params['domainname'] ? $params['domainname'] : $domain_2;
	$params['domainname'] = strtolower(trim($params['domainname']));
	$cmd = 'domain_sync';
	$postfields['auth-user'] = $params['Username'];
	$postfields['auth-pwd'] = $params['Password'];
	$postfields['auth-id'] = $params['ResellerID'];
	$formdata = array(
		'is_whmcs' => '1',
		'domainName' => $params['domainname']
	);
	$result = execute($cmd, $postfields, $formdata);
	$result = json_decode($result, true);
    if ($result["status"] == "ERROR") {
        return array("error" => $result["message"]);
    }
    $currentstatus = $result["currentstatus"];
    if ($currentstatus == "InActive") {
        return array("inprogress" => true);
    }
    $expirytime = $result["endtime"];
    if ($expirytime) {
        $returndata = array();
        if ($currentstatus == "Active") {
            $returndata["active"] = true;
        } else {
            if ($currentstatus == "Expired") {
                $returndata["expired"] = true;
            }
        }
        $returndata["expirydate"] = date("Y-m-d", $expirytime);
        return $returndata;
    }
    return array("error" => "No expiry date returned");
}
function nhanhoa_DomainSync($registrar) {
    $lcregistrar = strtolower($registrar);
    $cronreport = (string) $registrar . " Domain Sync Report<br>\n---------------------------------------------------<br>\n";
    $params = getRegistrarConfigOptions($lcregistrar);
    $postfields["auth-userid"] = $params["ResellerID"];
    $postfields["api-key"] = $params["APIKey"];
    $testmode = $params["TestMode"];
    $queryresult = select_query("tbldomains", "id,domain,status", "registrar='" . $lcregistrar . "' AND (status='Pending Transfer' OR status='Active')");
    while ($data = mysql_fetch_array($queryresult)) {
        $domainid = $data["id"];
        $domainname = $data["domain"];
		$domainname_2 = strtolower(trim($domainname));
		$cmd = 'domain_sync';
		$postfields['auth-user'] = $params['Username'];
		$postfields['auth-pwd'] = $params['Password'];
		$postfields['auth-id'] = $params['ResellerID'];
		$formdata = array(
			'is_whmcs' => '1',
			'domainName' => $domainname_2
		);
		$result = execute($cmd, $postfields, $formdata);
		$result = json_decode($result, true);
		if ($result['status'] == 'error') {
			$cronreport .= "Error for " . $domainname . ": " . $result["msg"] . "<br>\n";
		} else {
			$expirytime = $currentstatus = "";
			$expirytime = $result["endtime"];
			$currentstatus = $result["currentstatus"];
			if ($expirytime) {
				$updateqry = array();
				if ($currentstatus == "Active") {
					$updateqry["status"] = "Active";
				}
				$expirydate = date("Y-m-d", $expirytime);
				$updateqry["expirydate"] = $expirydate;
				if (count($updateqry)) {
					update_query("tbldomains", $updateqry, array("id" => $domainid));
				}
				$cronreport .= "Updated " . $domainname . " expiry to " . fromMySQLDate($expirydate) . "<br>\n";
			} else {
				$cronreport .= "Error for " . $domainname . ": No expiry date returned<br>\n";
			}
		}
    }
    echo $cronreport;
    logActivity((string) $registrar . " Domain Sync Run");
    sendAdminNotification("system", "WHMCS " . $registrar . " Domain Syncronisation Report", $cronreport);
}
function check_input($data = array()) {
	foreach ($data as $key => $value) {
		$key = strtolower($key);
		$value = trim($value);
		if (preg_match('/[*]/', $value)) {
			$msg = array('status' => 'error', 'msg' => 'Dữ liệu không được có dấu (*) ' . $value);
			return $msg;
		}
		if ((preg_match('/birthday/', $key) == true) && ($data['ord_owner_type'] == 0)) {
			if (isValidBirthday($value) == false) {
				$msg = array('status' => 'error', 'msg' => 'Ngày sinh không đúng định dạng (dd/mm/yyyy) hoặc tuổi nhỏ hơn 15!');
				return $msg;
			}
		}
		if ($key == 'ownername' && $data['ord_owner_type'] == 0) {
			$value = trim($value);
			if (empty($value)) {
				$msg = array('status' => 'error', 'msg' => 'Vui lòng không bỏ trống tên chủ thể');
				return $msg;
			}
		}
		if ($key == 'congty_ten' && $data['ord_owner_type'] == 1) {
			$value = trim($value);
			if (empty($value)) {
				$msg = array('status' => 'error', 'msg' => 'Quý khách đăng ký với hồ sơ công ty / tổ chức. Vui lòng nhập tên công ty / tổ chức');
				return $msg;
			}
		}
		if (preg_match('/address/i', $key)) {
			$value = trim($value);
			if (empty($value)) {
				$msg = array('status' => 'error', 'msg' => 'Vui lòng không bỏ trống địa chỉ địa chỉ chủ thể');
				return $msg;
			}
		}
		if (preg_match('/personid/i', $key) && $data['ord_owner_type'] == 0) {
			if (empty($value)) {
				$msg = array('status' => 'error', 'msg' => 'Vui lòng không bỏ trống địa chỉ CMND/Passport');
				return $msg;
			}
			if (!preg_match('/^(00|01|02|03|04|05|06|07|08|09|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|280|281|285|29|30|31|32|33|34|35|36|37|38|40)[0-9]{6,}/', $value) && !preg_match('/^[A-Z]{1,2}[0-9]+[A-Z0-9]*/i', $value)) {
				$msg = array('status' => 'error', 'msg' => 'Thông tin số CMND/Passport không hợp lệ. Vui lòng kiểm tra lại');
				return $msg;
			}
		}
	}
	return array('status' => 'success', 'msg' => '');
}
function isValidBirthday($cnt_birthday) {
	list($dd, $mm, $yyyy) = explode('/', $cnt_birthday);
	if (!checkdate($mm, $dd, $yyyy)) {
		return false;
	}
	$current_year = date('Y');
	$remain_year = intval($current_year - $yyyy);
	if ($remain_year < 15) {
		return false;
	}
	return true;
}
function execute($cmd, $postfields, $formdata) {
	$root_domain = 'http://api.nhanhoa.com/';
	$postdata = '';
	if ($cmd == '') {
		return serialize(array('status' => 'error', 'msg' => 'Không có lệnh để thực thi API.'));
	}
	$url = $root_domain . '?act=' . $cmd;
	foreach ($formdata as $fname => $fkey) {
		$postdata .= $fname . '=' . urlencode(str_replace('&amp;', '&', $fkey)) . '&';
	}
	$postfields['cmd'] = $cmd;
	$postfields['formdata'] = $postdata;
	$user_agent = 'Mozilla/5.0 (compatible; MSIE 5.01; Windows NT 5.0)';
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_POST, 1);
	curl_setopt($ch, CURLOPT_HEADER, 0);
	curl_setopt($ch, CURLOPT_TIMEOUT, 1000);
	curl_setopt($ch, CURLOPT_POSTFIELDS, $postfields);
	curl_setopt($ch, CURLOPT_USERAGENT, $user_agent);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	$data = curl_exec($ch);
	curl_close($ch);
	return $data;
}
?>